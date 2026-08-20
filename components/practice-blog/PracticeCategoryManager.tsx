"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  deletePracticeCategory,
  savePracticeCategory,
} from "@/app/admin/practice/actions";
import {
  PRACTICE_HUB,
  practiceCategoryPath,
  slugifyPractice,
} from "@/lib/practice-blog/constants";
import type { PracticeCategory } from "@/lib/practice-blog/queries";

type Props = {
  categories: PracticeCategory[];
  postCounts: Record<string, number>;
};

export default function PracticeCategoryManager({
  categories: initial,
  postCounts,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(() =>
    initial.length === 0 ? 0 : Math.max(...initial.map((c) => c.sort_order)) + 10
  );
  const [published, setPublished] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const nextSort = useMemo(() => {
    if (initial.length === 0) return 0;
    return Math.max(...initial.map((c) => c.sort_order)) + 10;
  }, [initial]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setSortOrder(nextSort);
    setPublished(true);
  }

  function startEdit(cat: PracticeCategory) {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setSlugTouched(true);
    setDescription(cat.description ?? "");
    setSortOrder(cat.sort_order);
    setPublished(cat.is_published);
    setMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const result = await savePracticeCategory({
      id: editingId ?? undefined,
      name,
      slug: slug || name,
      description,
      sort_order: sortOrder,
      is_published: published,
    });
    setLoading(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setMessage({
      ok: true,
      text: editingId ? "칸을 수정했습니다." : "칸을 추가했습니다.",
    });
    resetForm();
    router.refresh();
  }

  async function handleDelete(cat: PracticeCategory) {
    const count = postCounts[cat.id] ?? 0;
    const extra =
      count > 0
        ? `\n이 칸에 연결된 글 ${count}개는 삭제되지 않고, 칸만 빠집니다.`
        : "";
    if (!confirm(`「${cat.name}」 칸을 삭제할까요?${extra}`)) return;
    setLoading(true);
    setMessage(null);
    const result = await deletePracticeCategory(cat.id);
    setLoading(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    if (editingId === cat.id) resetForm();
    setMessage({ ok: true, text: "칸을 삭제했습니다." });
    router.refresh();
  }

  async function togglePublished(cat: PracticeCategory) {
    setLoading(true);
    setMessage(null);
    const result = await savePracticeCategory({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      sort_order: cat.sort_order,
      is_published: !cat.is_published,
    });
    setLoading(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="card space-y-3">
        <h2 className="text-lg font-bold text-slate-900">
          {editingId ? "칸 수정" : "칸 추가"}
        </h2>
        <p className="text-sm text-slate-600">
          상단의 「청소업 실무」는 고정이고, 여기서 만드는 것은 그 안의 과정 칸입니다.
          예: 입주청소, 에어컨, 바닥, 마케팅.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">이름</label>
            <input
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugifyPractice(e.target.value));
              }}
              required
              placeholder="입주청소"
            />
          </div>
          <div>
            <label className="label">주소 (슬러그)</label>
            <input
              className="input"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="입주청소"
            />
            <p className="mt-1 text-xs text-slate-500">
              {slug.trim()
                ? practiceCategoryPath(slugifyPractice(slug) || slug)
                : "/practice/c/…"}
            </p>
          </div>
        </div>
        <div>
          <label className="label">설명 (허브 카드)</label>
          <textarea
            className="input min-h-[72px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="이사·입주 전 1회 청소 순서와 현장 팁"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="label">순서</label>
            <input
              type="number"
              className="input w-28"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            공개 (체크 시 /practice에 카드로 보임)
          </label>
        </div>
        {message ? (
          <p className={message.ok ? "text-sm text-teal-800" : "text-sm text-rose-700"}>
            {message.text}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "저장 중…" : editingId ? "수정 저장" : "칸 추가"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={resetForm}
              disabled={loading}
            >
              추가 모드로
            </button>
          ) : null}
          <Link href={PRACTICE_HUB.adminHref} className="btn-secondary">
            글 목록
          </Link>
        </div>
      </form>

      {initial.length === 0 ? (
        <p className="text-slate-500">아직 칸이 없습니다. 위에서 첫 칸을 만드세요.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {initial.map((cat) => (
            <li
              key={cat.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">
                  {cat.name}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    순서 {cat.sort_order}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {cat.slug}
                  {" · "}
                  {cat.is_published ? (
                    <span className="text-teal-700">공개</span>
                  ) : (
                    <span className="text-amber-700">숨김</span>
                  )}
                  {" · "}글 {postCounts[cat.id] ?? 0}개
                </p>
                {cat.description ? (
                  <p className="mt-1 text-sm text-slate-600">{cat.description}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.is_published ? (
                  <Link
                    href={practiceCategoryPath(cat.slug)}
                    className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
                    target="_blank"
                  >
                    보기
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
                  onClick={() => void togglePublished(cat)}
                  disabled={loading}
                >
                  {cat.is_published ? "숨기기" : "공개"}
                </button>
                <button
                  type="button"
                  className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
                  onClick={() => startEdit(cat)}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="rounded bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
                  onClick={() => void handleDelete(cat)}
                  disabled={loading}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
