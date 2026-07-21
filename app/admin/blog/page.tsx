import Link from "next/link";
import { eduBlogPath, eduIntentLabel } from "@/lib/edu-blog/constants";
import { listAdminEduBlogPosts } from "@/lib/edu-blog/queries";

export default async function AdminBlogPage() {
  const posts = await listAdminEduBlogPosts();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">청소지식</h1>
          <p className="mt-1 text-sm text-slate-600">
            직접 작성 · 다음 글·제품 연결 · 발행 시 /blog 공개
          </p>
          <p className="mt-2 text-xs text-amber-800">
            저장 오류 시: Supabase에{" "}
            <code className="rounded bg-amber-50 px-1">198_edu_blog_posts.sql</code> 적용
            여부를 확인하세요.
          </p>
        </div>
        <Link href="/admin/blog/new" className="btn-primary">
          새 글
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-slate-500">아직 글이 없습니다. 새 글을 작성하세요.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{post.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {post.slug ?? "(슬러그 없음)"}
                  {eduIntentLabel(post.edu_intent)
                    ? ` · ${eduIntentLabel(post.edu_intent)}`
                    : ""}
                  {" · "}
                  {post.published_at ? (
                    <span className="text-teal-700">발행</span>
                  ) : (
                    <span className="text-amber-700">초안</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.slug && post.published_at ? (
                  <Link
                    href={eduBlogPath(post.slug)}
                    className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
                    target="_blank"
                  >
                    보기
                  </Link>
                ) : null}
                <Link
                  href={`/admin/blog/${post.id}/edit`}
                  className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
                >
                  수정
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
