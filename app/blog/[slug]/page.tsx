import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EduBlogArticleView from "@/components/edu-blog/EduBlogArticleView";
import {
  getPublishedEduBlogBySlug,
  getPublishedEduBlogsBySlugs,
  listPublishedEduBlogPosts,
} from "@/lib/edu-blog/queries";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await listPublishedEduBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedEduBlogBySlug(slug);
  if (!post) return { title: "글" };
  return buildPageMetadata({
    title: `${post.title} | 클린아이덱스`,
    description: post.excerpt ?? `${post.title} — 청소지식`,
    path: `/blog/${post.slug}`,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedEduBlogBySlug(slug);
  if (!post) notFound();

  const linkSlugs = [
    ...(post.next_slug ? [post.next_slug] : []),
    ...post.related_slugs.filter((s) => s && s !== post.next_slug && s !== post.slug),
  ];
  const linkedPosts = await getPublishedEduBlogsBySlugs(linkSlugs);
  const bySlug = new Map(linkedPosts.map((p) => [p.slug, p]));
  const nextPost = post.next_slug ? bySlug.get(post.next_slug) ?? null : null;
  const relatedPosts = post.related_slugs
    .filter((s) => s && s !== post.next_slug && s !== post.slug)
    .map((s) => bySlug.get(s))
    .filter((p): p is NonNullable<typeof p> => p != null);

  const allProducts = await listMergedProducts();
  const productMap = new Map(allProducts.map((p) => [p.id, p]));
  const products = post.product_ids
    .map((id) => productMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null && p.status !== "draft");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/40">
      <div className="page-shell py-6 sm:py-10">
        <nav className="mb-6 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-teal-700">
            홈
          </Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-teal-700">
            청소지식
          </Link>
          <span className="mx-2">/</span>
          <span className="line-clamp-1 text-slate-800">{post.title}</span>
        </nav>

        <EduBlogArticleView
          post={post}
          nextPost={nextPost}
          relatedPosts={relatedPosts}
          products={products}
        />
      </div>
    </main>
  );
}
