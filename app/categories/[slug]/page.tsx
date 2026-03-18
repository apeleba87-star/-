import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Metadata } from "next";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createClient();
  const { data: category } = await supabase
    .from("content_categories")
    .select("name")
    .eq("slug", slug)
    .single();
  if (!category) return {};
  return {
    title: category.name,
    description: `클린아이덱스 ${category.name} 카테고리 — 청소·방역 업계 정보와 리포트`,
  };
}

export default async function CategorySlugPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createClient();
  const { data: category } = await supabase
    .from("content_categories")
    .select("id, slug, name")
    .eq("slug", slug)
    .single();

  if (!category) notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, excerpt, published_at, slug")
    .eq("category_id", category.id)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/categories" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 카테고리
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">{category.name}</h1>
      {!posts?.length ? (
        <div className="card">
          <p className="text-slate-500">아직 글이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`}
                className="card block hover:border-blue-200"
              >
                <h2 className="font-semibold text-slate-800">{post.title}</h2>
                {post.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{post.excerpt}</p>
                )}
                <time className="mt-2 block text-xs text-slate-500">
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString("ko-KR")
                    : ""}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
