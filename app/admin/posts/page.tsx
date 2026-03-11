import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import Button from "@/components/Button";

type Filter = "all" | "drafts" | "auto_drafts";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createServerSupabase();
  const { filter: filterParam } = await searchParams;
  const filter: Filter =
    filterParam === "drafts" || filterParam === "auto_drafts" ? filterParam : "all";

  let query = supabase
    .from("posts")
    .select("id, title, newsletter_include, published_at, created_at, source_type, source_ref")
    .order("created_at", { ascending: false });

  if (filter === "drafts") {
    query = query.is("published_at", null);
  } else if (filter === "auto_drafts") {
    query = query.is("published_at", null).not("source_type", "is", null);
  }

  const { data: posts } = await query;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">글 관리</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">필터:</span>
          <Link
            href="/admin/posts"
            className={`rounded border px-3 py-1.5 text-sm ${filter === "all" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            전체
          </Link>
          <Link
            href="/admin/posts?filter=drafts"
            className={`rounded border px-3 py-1.5 text-sm ${filter === "drafts" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            미발행
          </Link>
          <Link
            href="/admin/posts?filter=auto_drafts"
            className={`rounded border px-3 py-1.5 text-sm ${filter === "auto_drafts" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            자동 생성 초안
          </Link>
          <Link href="/admin/posts/new">
            <Button>새 글</Button>
          </Link>
        </div>
      </div>
      {!posts?.length ? (
        <div className="card">
          <p className="text-slate-500">글이 없습니다.</p>
          <Link href="/admin/posts/new" className="mt-2 inline-block text-blue-600 hover:underline">
            첫 글 쓰기
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <span className="font-medium text-slate-800">{post.title}</span>
                <span className="ml-2 text-sm text-slate-500">
                  {post.published_at ? "발행됨" : "미발행"}
                  {post.newsletter_include && " · 뉴스레터 포함"}
                  {post.source_type && (
                    <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                      자동
                    </span>
                  )}
                </span>
              </div>
              <Link href={`/admin/posts/${post.id}/edit`} className="text-sm text-blue-600 hover:underline">
                수정
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
