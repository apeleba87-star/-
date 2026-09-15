import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EduBlogPostCards from "@/components/edu-blog/EduBlogPostCards";
import {
  getPublishedEduBlogCategoryBySlug,
  listPublishedEduBlogCategories,
} from "@/lib/edu-blog/categories";
import {
  EDU_BLOG_KNOWLEDGE_LABEL,
  EDU_BLOG_NAV_LABEL,
  eduBlogCategoryPath,
} from "@/lib/edu-blog/constants";
import { listPublishedEduBlogPostsByCategory } from "@/lib/edu-blog/queries";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const categories = await listPublishedEduBlogCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublishedEduBlogCategoryBySlug(slug);
  if (!category) return { title: EDU_BLOG_KNOWLEDGE_LABEL };
  return buildPageMetadata({
    title: `${category.name} | ${EDU_BLOG_NAV_LABEL}`,
    description:
      category.description ??
      `${category.name} 실무 글을 읽고 같은 과정의 다음 편으로 이어집니다.`,
    path: eduBlogCategoryPath(category.slug),
  });
}

export default async function EduBlogCategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getPublishedEduBlogCategoryBySlug(slug);
  if (!category) notFound();

  const posts = await listPublishedEduBlogPostsByCategory(category.id, { limit: 100 });
  const categoryLabelById = new Map([[category.id, category.name]]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="page-shell py-6 sm:py-10">
        <nav className="mb-6 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-teal-700">
            홈
          </Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-teal-700">
            {EDU_BLOG_KNOWLEDGE_LABEL}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">{category.name}</span>
        </nav>

        <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {category.name}
          </h1>
          {category.description ? (
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">
              {category.description}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-bold text-teal-800">{posts.length}개 글</p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-10 text-center text-slate-500">이 칸에 발행된 글이 아직 없습니다.</p>
        ) : (
          <EduBlogPostCards posts={posts} categoryLabelById={categoryLabelById} />
        )}
      </div>
    </main>
  );
}
