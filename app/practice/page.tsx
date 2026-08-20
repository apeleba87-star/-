import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ReportListPagination from "@/components/report/ReportListPagination";
import { PRACTICE_HUB, practiceBlogPath, practiceCategoryPath } from "@/lib/practice-blog/constants";
import {
  listPublishedPracticeCategories,
  listPublishedPracticePosts,
} from "@/lib/practice-blog/queries";
import {
  clampReportListPage,
  parseReportListPage,
  reportListPageCount,
} from "@/lib/report/report-list-pagination";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

const PAGE_SIZE = 12;

export const metadata: Metadata = buildPageMetadata({
  title: "청소업 실무 | 클린아이덱스",
  description:
    "입주·에어컨·바닥 청소와 마케팅 실무. 과정별로 읽고 다음 편으로 이어집니다.",
  path: PRACTICE_HUB.href,
});

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function shortExcerpt(excerpt: string | null, max = 72): string | null {
  if (!excerpt) return null;
  const oneLine = excerpt.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max).trim()}…`;
}

function buildPageHref(page: number): string {
  return page <= 1 ? PRACTICE_HUB.href : `${PRACTICE_HUB.href}?page=${page}`;
}

export default async function PracticeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const [categories, posts] = await Promise.all([
    listPublishedPracticeCategories(),
    listPublishedPracticePosts(),
  ]);
  const totalCount = posts.length;
  const page = clampReportListPage(parseReportListPage(rawPage), totalCount, PAGE_SIZE);
  const pageCount = reportListPageCount(totalCount, PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const pagePosts = posts.slice(start, start + PAGE_SIZE);
  const rangeEnd = Math.min(start + pagePosts.length, totalCount);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="page-shell py-6 sm:py-10">
        <nav className="mb-6 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-teal-700">
            홈
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">{PRACTICE_HUB.label}</span>
        </nav>

        <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {PRACTICE_HUB.label}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">
            입주·에어컨·마케팅처럼 과정별로 실무 글을 모아 두는 곳입니다. 기존 청소지식 글과는 별도입니다.
          </p>
          <p className="mt-2 text-sm font-bold text-teal-800">
            {totalCount === 0
              ? "0개 글"
              : pageCount > 1
                ? `최신 글 · ${start + 1}–${rangeEnd} / ${totalCount}`
                : `${totalCount}개 글`}
          </p>
        </header>

        {categories.length > 0 ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={practiceCategoryPath(cat.slug)}
                  className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
                >
                  <span className="text-lg font-black tracking-tight text-slate-950 group-hover:text-teal-800">
                    {cat.name}
                  </span>
                  {cat.description ? (
                    <span className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {cat.description}
                    </span>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-bold text-teal-800">
                    칸 보기
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {totalCount === 0 ? (
          <p className="mt-10 text-center text-slate-500">아직 발행된 실무 글이 없습니다.</p>
        ) : (
          <>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {pagePosts.map((post) => {
                const excerpt = shortExcerpt(post.excerpt);
                return (
                  <li key={post.id}>
                    <Link
                      href={practiceBlogPath(post.slug)}
                      className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-6"
                    >
                      {post.category_name && post.category_slug ? (
                        <span className="inline-flex w-fit rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 ring-1 ring-teal-100">
                          {post.category_name}
                        </span>
                      ) : null}
                      <span className="mt-3 block text-xl font-black leading-snug tracking-tight text-slate-950 group-hover:text-teal-800 sm:text-2xl">
                        {post.title}
                      </span>
                      {excerpt ? (
                        <span className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                          {excerpt}
                        </span>
                      ) : null}
                      <span className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
                        <time dateTime={post.published_at} className="font-medium text-slate-500">
                          {formatDate(post.published_at)}
                        </time>
                        <span className="inline-flex items-center gap-1 font-bold text-teal-800">
                          읽어보기
                          <ArrowRight
                            className="h-4 w-4 transition group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <ReportListPagination
              page={page}
              totalCount={totalCount}
              buildHref={buildPageHref}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </div>
    </main>
  );
}
