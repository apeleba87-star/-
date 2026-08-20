import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PRACTICE_HUB, practiceBlogPath, practiceCategoryPath } from "@/lib/practice-blog/constants";
import {
  getPublishedPracticeCategoryBySlug,
  listPublishedPracticeCategories,
  listPublishedPracticePosts,
} from "@/lib/practice-blog/queries";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const categories = await listPublishedPracticeCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublishedPracticeCategoryBySlug(slug);
  if (!category) return { title: "칸" };
  return buildPageMetadata({
    title: `${category.name} | ${PRACTICE_HUB.label}`,
    description: category.description ?? `${category.name} 실무 글`,
    path: practiceCategoryPath(category.slug),
  });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PracticeCategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getPublishedPracticeCategoryBySlug(slug);
  if (!category) notFound();

  const posts = await listPublishedPracticePosts({ categoryId: category.id });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="page-shell py-6 sm:py-10">
        <nav className="mb-6 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-teal-700">
            홈
          </Link>
          <span className="mx-2">/</span>
          <Link href={PRACTICE_HUB.href} className="hover:text-teal-700">
            {PRACTICE_HUB.label}
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
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={practiceBlogPath(post.slug)}
                  className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-6"
                >
                  <span className="block text-xl font-black leading-snug tracking-tight text-slate-950 group-hover:text-teal-800">
                    {post.title}
                  </span>
                  {post.excerpt ? (
                    <span className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {post.excerpt}
                    </span>
                  ) : null}
                  <span className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
                    <time dateTime={post.published_at} className="font-medium text-slate-500">
                      {formatDate(post.published_at)}
                    </time>
                    <span className="inline-flex items-center gap-1 font-bold text-teal-800">
                      읽어보기
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
