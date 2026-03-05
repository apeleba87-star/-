import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import Button from "@/components/Button";

export default async function AdminPostsPage() {
  const supabase = await createServerSupabase();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, newsletter_include, published_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">글 관리</h1>
        <Link href="/admin/posts/new">
          <Button>새 글</Button>
        </Link>
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
