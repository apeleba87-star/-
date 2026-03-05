"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";

type Category = { id: string; slug: string; name: string };
type Post = {
  id: string;
  title: string;
  slug: string | null;
  body: string | null;
  excerpt: string | null;
  category_id: string | null;
  newsletter_include: boolean;
  published_at: string | null;
};

const TEMPLATES: Record<string, { title: string; body: string; categorySlug: string }> = {
  chemical: { title: "약품 소식", body: "내용을 입력하세요.", categorySlug: "chemical" },
  equipment: { title: "장비 소식", body: "내용을 입력하세요.", categorySlug: "equipment" },
  industry: { title: "업계 이슈", body: "내용을 입력하세요.", categorySlug: "industry" },
};

export default function PostForm({
  categories,
  post,
}: {
  categories: Category[];
  post?: Post | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [categoryId, setCategoryId] = useState(post?.category_id ?? "");
  const [newsletterInclude, setNewsletterInclude] = useState(post?.newsletter_include ?? false);
  const [publish, setPublish] = useState(!!post?.published_at);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(key: string) {
    const t = TEMPLATES[key];
    if (!t) return;
    setTitle(t.title);
    setBody(t.body);
    const cat = categories.find((c) => c.slug === t.categorySlug);
    if (cat) setCategoryId(cat.id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      title,
      slug: slug || null,
      body: body || null,
      excerpt: excerpt || null,
      category_id: categoryId || null,
      newsletter_include: newsletterInclude,
      published_at: publish ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      created_by: user?.id ?? null,
    };
    if (post) {
      const { error: err } = await supabase.from("posts").update(payload).eq("id", post.id);
      if (err) setError(err.message);
      else {
        if (newsletterInclude) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await supabase.from("newsletter_queue").insert({
            type: "manual",
            ref_type: "post",
            ref_id: post.id,
            title,
            summary: excerpt || null,
            scheduled_for: tomorrow.toISOString().slice(0, 10),
            sort_order: 0,
          });
        }
        router.push("/admin/posts");
      }
    } else {
      const { data: inserted, error: err } = await supabase.from("posts").insert(payload).select("id").single();
      if (err) setError(err.message);
      else if (inserted && newsletterInclude) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await supabase.from("newsletter_queue").insert({
          type: "manual",
          ref_type: "post",
          ref_id: inserted.id,
          title,
          summary: excerpt || null,
          scheduled_for: tomorrow.toISOString().slice(0, 10),
          sort_order: 0,
        });
        router.push("/admin/posts");
      } else if (!err) router.push("/admin/posts");
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(TEMPLATES).map(([key, t]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyTemplate(key)}
            className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
          >
            {t.title} 템플릿
          </button>
        ))}
      </div>
      <div>
        <label className="label">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          required
        />
      </div>
      <div>
        <label className="label">슬러그 (선택)</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="input"
          placeholder="url-friendly"
        />
      </div>
      <div>
        <label className="label">카테고리</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input"
        >
          <option value="">선택</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">요약</label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="input min-h-[60px]"
        />
      </div>
      <div>
        <label className="label">본문</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input min-h-[200px]"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={newsletterInclude}
            onChange={(e) => setNewsletterInclude(e.target.checked)}
          />
          <span className="text-sm text-slate-700">다음 뉴스레터에 포함</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
          />
          <span className="text-sm text-slate-700">발행</span>
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "저장 중…" : post ? "수정" : "저장"}
        </Button>
        <Link href="/admin/posts">
          <Button type="button" variant="secondary">취소</Button>
        </Link>
      </div>
    </form>
  );
}
