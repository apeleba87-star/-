import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EduBlogArticleView from "@/components/edu-blog/EduBlogArticleView";
import {
  PRACTICE_HUB,
  practiceBlogPath,
  practiceCategoryPath,
} from "@/lib/practice-blog/constants";
import {
  getPublishedPracticeBySlug,
  getPublishedPracticeBySlugs,
  listPublishedPracticePosts,
  type PracticeBlogPost,
} from "@/lib/practice-blog/queries";
import type { EduBlogPost } from "@/lib/edu-blog/queries";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

function toEduShape(post: PracticeBlogPost): EduBlogPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    body: post.body,
    excerpt: post.excerpt,
    edu_intent: null,
    next_slug: post.next_slug,
    related_slugs: post.related_slugs,
    product_ids: post.product_ids,
    published_at: post.published_at,
    updated_at: post.updated_at,
  };
}

export async function generateStaticParams() {
  const posts = await listPublishedPracticePosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPracticeBySlug(slug);
  if (!post) return { title: "글" };
  return buildPageMetadata({
    title: `${post.title} | 클린아이덱스`,
    description: post.excerpt ?? `${post.title} — ${PRACTICE_HUB.label}`,
    path: practiceBlogPath(post.slug),
  });
}

export default async function PracticePostPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "c") notFound();
  const post = await getPublishedPracticeBySlug(slug);
  if (!post) notFound();

  const linkSlugs = [
    ...(post.next_slug ? [post.next_slug] : []),
    ...post.related_slugs.filter((s) => s && s !== post.next_slug && s !== post.slug),
  ];
  const linkedPosts = await getPublishedPracticeBySlugs(linkSlugs);
  const bySlug = new Map(linkedPosts.map((p) => [p.slug, p]));
  const nextPost = post.next_slug ? bySlug.get(post.next_slug) ?? null : null;
  const relatedPosts = post.related_slugs
    .filter((s) => s && s !== post.next_slug && s !== post.slug)
    .map((s) => bySlug.get(s))
    .filter((p): p is PracticeBlogPost => p != null);

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
          <Link href={PRACTICE_HUB.href} className="hover:text-teal-700">
            {PRACTICE_HUB.label}
          </Link>
          {post.category_name && post.category_slug ? (
            <>
              <span className="mx-2">/</span>
              <Link
                href={practiceCategoryPath(post.category_slug)}
                className="hover:text-teal-700"
              >
                {post.category_name}
              </Link>
            </>
          ) : null}
          <span className="mx-2">/</span>
          <span className="line-clamp-1 text-slate-800">{post.title}</span>
        </nav>

        <EduBlogArticleView
          post={toEduShape(post)}
          nextPost={nextPost ? toEduShape(nextPost) : null}
          relatedPosts={relatedPosts.map(toEduShape)}
          products={products}
          hubHref={PRACTICE_HUB.href}
          hubLabel={PRACTICE_HUB.label}
          postPath={practiceBlogPath}
          category={
            post.category_name && post.category_slug
              ? { name: post.category_name, href: practiceCategoryPath(post.category_slug) }
              : null
          }
        />
      </div>
    </main>
  );
}
