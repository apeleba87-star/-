import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase-server";
import { getActivePostDetailAds } from "@/lib/ads";
import AdNativeCard from "@/components/home/AdNativeCard";

export const revalidate = 60;

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  const [adsResult, { data: post, error }] = await Promise.all([
    getActivePostDetailAds(),
    supabase
      .from("posts")
      .select("*, category:content_categories(id, slug, name)")
      .eq("id", id)
      .not("published_at", "is", null)
      .single(),
  ]);

  if (error || !post) {
    const bySlug = await supabase
      .from("posts")
      .select("*, category:content_categories(id, slug, name)")
      .eq("slug", id)
      .not("published_at", "is", null)
      .single();
    if (bySlug.error || !bySlug.data) notFound();
    return renderPost(bySlug.data, adsResult);
  }
  return renderPost(post!, adsResult);
}

type PostForRender = {
  id: string;
  title: string;
  body: string | null;
  excerpt: string | null;
  published_at: string | null;
  source_type?: string | null;
  category?: { slug: string; name: string } | null;
};

type PostDetailAds = Awaited<ReturnType<typeof getActivePostDetailAds>>;

function renderPost(post: PostForRender, ads: PostDetailAds) {
  const isReport = Boolean(post.source_type);
  const showTopAd = ads.post_top?.enabled && ads.post_top.campaign;
  const showBottomAd = ads.post_bottom?.enabled && ads.post_bottom.campaign;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/categories" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 카테고리
      </Link>
      <article className="card">
        {post.category && (
          <span className="text-sm font-medium text-blue-600">{post.category.name}</span>
        )}
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{post.title}</h1>
        <time className="mt-2 block text-sm text-slate-500">
          {post.published_at
            ? new Date(post.published_at).toLocaleDateString("ko-KR")
            : ""}
        </time>
        {post.excerpt && <p className="mt-4 text-slate-600">{post.excerpt}</p>}

        {showTopAd && ads.post_top?.campaign && (
          <div className="mt-6">
            <AdNativeCard campaign={ads.post_top.campaign} />
          </div>
        )}

        {post.body &&
          (isReport ? (
            <div className={`prose prose-slate mt-6 max-w-none ${isReport ? "post-report" : ""}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
            </div>
          ) : (
            <div className="prose prose-slate mt-6 max-w-none whitespace-pre-wrap">
              {post.body}
            </div>
          ))}

        {showBottomAd && ads.post_bottom?.campaign && (
          <div className="mt-8">
            <AdNativeCard campaign={ads.post_bottom.campaign} />
          </div>
        )}
      </article>
    </div>
  );
}
