"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/Button";
import {
  deletePracticeBlogPost,
  savePracticeBlogPost,
} from "@/app/admin/practice/actions";
import EduBlogImageToolbar, {
  insertMarkdownAt,
  type EduImagePlace,
} from "@/components/edu-blog/EduBlogImageToolbar";
import EduBlogImageManager from "@/components/edu-blog/EduBlogImageManager";
import {
  PRACTICE_HUB,
  practiceBlogPath,
  slugifyPractice,
} from "@/lib/practice-blog/constants";
import type { PracticeCategory } from "@/lib/practice-blog/queries";

type ProductOption = { id: string; name: string; brand: string };
type BlogOption = { slug: string; title: string };

type PostInput = {
  id: string;
  title: string;
  slug: string | null;
  body: string | null;
  excerpt: string | null;
  next_slug: string | null;
  related_slugs: string[] | null;
  product_ids: string[] | null;
  published_at: string | null;
  practice_category_id: string | null;
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function utcIsoToKstLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const kst = new Date(t.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const mo = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  const h = String(kst.getUTCHours()).padStart(2, "0");
  const mi = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function kstLocalInputToUtcIso(local: string): string | null {
  const m = local.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const asIfUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, 0, 0);
  return new Date(asIfUtc - KST_OFFSET_MS).toISOString();
}

function formatKstDisplay(local: string): string {
  const m = local.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return "";
  const [, y, mo, d, h, mi] = m;
  return `${y}. ${Number(mo)}. ${Number(d)}. ${h}:${mi}`;
}

function resolveBlogSlug(value: string | null | undefined, options: BlogOption[]): string {
  if (!value?.trim()) return "";
  const v = value.trim();
  if (options.some((b) => b.slug === v)) return v;
  const byTitle = options.find((b) => b.title === v);
  return byTitle?.slug ?? v;
}

export default function PracticeBlogForm({
  products,
  blogOptions,
  categories,
  post,
}: {
  products: ProductOption[];
  blogOptions: BlogOption[];
  categories: PracticeCategory[];
  post?: PostInput | null;
}) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const draftMediaId = useRef(
    post?.id ?? `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post?.slug);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [categoryId, setCategoryId] = useState(post?.practice_category_id ?? "");
  const [nextSlug, setNextSlug] = useState(() =>
    resolveBlogSlug(post?.next_slug, blogOptions)
  );
  const [relatedSlugs, setRelatedSlugs] = useState<string[]>(() =>
    (post?.related_slugs ?? [])
      .map((s) => resolveBlogSlug(s, blogOptions))
      .filter(Boolean)
  );
  const [productIds, setProductIds] = useState<string[]>(post?.product_ids ?? []);
  const [publish, setPublish] = useState(!!post?.published_at);
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    utcIsoToKstLocalInput(post?.published_at)
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const [blogFilter, setBlogFilter] = useState("");

  const otherBlogs = useMemo(() => {
    const self = slug.trim();
    return blogOptions.filter((b) => b.slug && b.slug !== self);
  }, [blogOptions, slug]);

  const filteredBlogs = useMemo(() => {
    const q = blogFilter.trim().toLowerCase();
    if (!q) return otherBlogs;
    return otherBlogs.filter(
      (b) =>
        b.title.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q)
    );
  }, [otherBlogs, blogFilter]);

  const filteredProducts = useMemo(() => {
    const q = productFilter.trim().toLowerCase();
    const list = !q
      ? products
      : products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q)
        );
    return [...list].sort((a, b) => {
      const aOn = productIds.includes(a.id) ? 0 : 1;
      const bOn = productIds.includes(b.id) ? 0 : 1;
      return aOn - bOn;
    });
  }, [products, productFilter, productIds]);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugifyPractice(value));
  }

  function toggleRelated(s: string) {
    setRelatedSlugs((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (s === nextSlug) return prev;
      return [...prev, s];
    });
  }

  function toggleProduct(id: string) {
    setProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function onNextChange(value: string) {
    setNextSlug(value);
    if (value) setRelatedSlugs((prev) => prev.filter((s) => s !== value));
  }

  const mediaEntityId = post?.id || slug.trim() || draftMediaId.current;

  function handleInsertImage(chunk: string, place: EduImagePlace) {
    const el = bodyRef.current;
    const cursor =
      el && place === "cursor"
        ? { start: el.selectionStart, end: el.selectionEnd }
        : null;
    const { next, cursor: nextCursor } = insertMarkdownAt(body, chunk, place, cursor);
    setBody(next);
    requestAnimationFrame(() => {
      const ta = bodyRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedSlug = slug.trim();
    if (!trimmedSlug) {
      setError("슬러그는 필수입니다. 제목을 입력하면 자동으로 만들어집니다.");
      setLoading(false);
      return;
    }
    if (publish && !categoryId) {
      setError("발행하려면 칸(메뉴)을 선택해 주세요. 초안은 칸 없이 저장할 수 있습니다.");
      setLoading(false);
      return;
    }

    const related = relatedSlugs.filter(
      (s) => s && s !== trimmedSlug && s !== nextSlug.trim()
    );

    const result = await savePracticeBlogPost({
      id: post?.id,
      title: title.trim(),
      slug: trimmedSlug,
      body: body.trim() || null,
      excerpt: excerpt.trim() || null,
      next_slug: nextSlug.trim() || null,
      related_slugs: related,
      product_ids: productIds,
      practice_category_id: categoryId || null,
      publish,
      existingPublishedAt: post?.published_at ?? null,
      publishAt:
        publish && scheduledLocal.trim()
          ? kstLocalInputToUtcIso(scheduledLocal)
          : null,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(PRACTICE_HUB.adminHref);
    router.refresh();
  }

  async function handleDelete() {
    if (!post?.id) return;
    if (!confirm("이 실무 글을 삭제할까요? 복구할 수 없습니다.")) return;
    setDeleting(true);
    setError(null);
    const result = await deletePracticeBlogPost(post.id);
    if (!result.ok) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    router.push(PRACTICE_HUB.adminHref);
    router.refresh();
  }

  const nextTitle = otherBlogs.find((b) => b.slug === nextSlug)?.title;
  const scheduledIso = scheduledLocal.trim()
    ? kstLocalInputToUtcIso(scheduledLocal)
    : null;
  const isScheduledFuture =
    !!scheduledIso && new Date(scheduledIso).getTime() > Date.now();

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {error ? (
        <p
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div>
        <label className="label">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="input"
          required
          placeholder="입주청소 첫날 동선"
        />
      </div>

      <div>
        <label className="label">슬러그 (URL)</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className="input"
          required
          placeholder="입주청소-첫날-동선"
        />
        <p className="mt-1 text-xs text-slate-500">
          제목 입력 시 자동 생성됩니다.
          {slug.trim() ? (
            <>
              {" · "}
              <Link href={practiceBlogPath(slug.trim())} className="text-teal-700 hover:underline">
                {practiceBlogPath(slug.trim())}
              </Link>
            </>
          ) : null}
        </p>
      </div>

      <div>
        <label className="label">칸 (메뉴)</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input"
        >
          <option value="">선택 안 함 (초안만)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.is_published ? "" : " · 숨김"}
            </option>
          ))}
        </select>
        {categories.length === 0 ? (
          <p className="mt-1 text-xs text-amber-700">
            칸이 없습니다.{" "}
            <Link href={PRACTICE_HUB.adminCategoriesHref} className="underline">
              칸 관리
            </Link>
            에서 입주청소·에어컨·마케팅처럼 먼저 만드세요.
          </p>
        ) : selectedCategory && !selectedCategory.is_published ? (
          <p className="mt-1 text-xs text-amber-700">
            이 칸은 숨김입니다. 글은 발행돼도 허브 칸 카드에는 안 나옵니다.
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            발행할 때는 칸이 필요합니다.{" "}
            <Link href={PRACTICE_HUB.adminCategoriesHref} className="text-teal-700 hover:underline">
              칸 추가·수정
            </Link>
          </p>
        )}
      </div>

      <div>
        <label className="label">요약 (SEO · 목록)</label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="input min-h-[80px]"
          placeholder="한두 문장 요약"
        />
      </div>

      <div>
        <label className="label">본문 (마크다운)</label>
        <p className="mb-1.5 text-xs text-slate-500">
          글은 마크다운으로 작성하세요. 사진은 위에서 넣은 다음, 아래에서{" "}
          <strong className="font-semibold text-slate-700">원하는 문단 칸으로 드래그</strong>해
          위치를 정하세요.
        </p>
        <div className="mb-2">
          <EduBlogImageToolbar
            entityId={mediaEntityId}
            entityType="practice_blog"
            defaultAlt={title.trim() || "청소업 실무 이미지"}
            disabled={loading}
            onInsert={handleInsertImage}
          />
        </div>
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input min-h-[280px] font-mono text-sm"
          placeholder={"## 현장에서\n\n핵심 순서\n\n- 1단계\n- 2단계"}
        />
        <div className="mt-2">
          <EduBlogImageManager body={body} onChange={setBody} disabled={loading} />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-bold text-slate-800">이어 읽기 · 연결</p>
        <div>
          <label className="label">다음 글</label>
          <select
            value={nextSlug}
            onChange={(e) => onNextChange(e.target.value)}
            className="input"
          >
            <option value="">선택 안 함</option>
            {otherBlogs.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.title}
              </option>
            ))}
          </select>
          {nextTitle ? (
            <p className="mt-1 text-xs text-teal-800">선택: {nextTitle}</p>
          ) : null}
        </div>

        <div>
          <label className="label">관련 글 (여러 개 선택)</label>
          <input
            type="search"
            value={blogFilter}
            onChange={(e) => setBlogFilter(e.target.value)}
            className="input mb-2"
            placeholder="제목 검색"
            disabled={otherBlogs.length === 0}
          />
          <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-slate-200 bg-white p-2">
            {filteredBlogs.length === 0 ? (
              <p className="px-2 py-2 text-sm text-slate-500">선택할 글이 없습니다.</p>
            ) : (
              filteredBlogs.map((b) => {
                const disabled = b.slug === nextSlug;
                return (
                  <label
                    key={b.slug}
                    className={`flex cursor-pointer items-start gap-2 rounded px-2 py-2 text-sm hover:bg-slate-50 ${
                      disabled ? "opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={relatedSlugs.includes(b.slug)}
                      disabled={disabled}
                      onChange={() => toggleRelated(b.slug)}
                    />
                    <span className="min-w-0 flex-1 font-medium text-slate-900">{b.title}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="label">맞는 제품 (기존 카탈로그)</label>
        <input
          type="search"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="input mb-2"
          placeholder="제품명·브랜드 검색"
        />
        <div className="max-h-56 space-y-1 overflow-y-auto rounded border border-slate-200 p-2">
          {filteredProducts.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50 ${
                productIds.includes(p.id) ? "bg-teal-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={productIds.includes(p.id)}
                onChange={() => toggleProduct(p.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-slate-900">{p.name}</span>
                <span className="ml-2 text-xs text-slate-500">{p.brand}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
          />
          발행 (체크 시 /practice 공개 · 사이트맵 포함)
        </label>
        {publish ? (
          <div>
            <label className="label">예약 발행 시각 (KST · 선택)</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className="input max-w-xs"
              />
              {scheduledLocal ? (
                <button
                  type="button"
                  onClick={() => setScheduledLocal("")}
                  className="btn-secondary text-sm"
                >
                  즉시 발행으로
                </button>
              ) : null}
            </div>
            {scheduledLocal ? (
              isScheduledFuture ? (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  예약: {formatKstDisplay(scheduledLocal)} 에 자동 공개
                </p>
              ) : (
                <p className="mt-1 text-xs text-teal-700">
                  {formatKstDisplay(scheduledLocal)} · 이미 지난 시각이라 저장 즉시 공개됩니다.
                </p>
              )
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading || deleting}>
          {loading ? "저장 중…" : post ? "수정 저장" : "작성"}
        </Button>
        <Link href={PRACTICE_HUB.adminHref} className="btn-secondary">
          목록
        </Link>
        {post?.id ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={loading || deleting}
            className="ml-auto text-sm text-red-600 underline hover:text-red-700 disabled:opacity-50"
          >
            {deleting ? "삭제 중…" : "글 삭제"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
