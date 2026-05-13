"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Layers } from "lucide-react";
import type { RelatedReportPostRow } from "@/lib/content/related-report-posts";
import { classifyReportKind } from "@/lib/content/related-report-posts";
import { getReportBadgeLabel } from "@/lib/news/report-list-title";
import { getReportCardListTitle } from "@/lib/news/report-list-title";

const BADGE: Record<ReturnType<typeof classifyReportKind>, string> = {
  daily: "bg-teal-50 text-teal-800 ring-1 ring-teal-200/75",
  award: "bg-violet-50 text-violet-800 ring-1 ring-violet-200/75",
  snapshot: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/70",
};

const DEFAULT_TITLE = "다른 리포트";
const DEFAULT_DESCRIPTION = "입찰·낙찰·시장 요약을 함께 보면 흐름을 잡기 쉽습니다.";

const DEFAULT_PAGE_SIZE = 10;

type Props = {
  posts: RelatedReportPostRow[];
  /** 부모 `space-y` 등과 맞출 때만 지정 (기본 상단 여백 없음) */
  className?: string;
  title?: string;
  description?: string;
  showAllLink?: boolean;
  /** 한 페이지에 여러 블록일 때 접근성용 고유 id */
  sectionHeadingId?: string;
  /** 목록 한 페이지당 개수 (기본 10) */
  pageSize?: number;
};

export default function RelatedReportsSection({
  posts,
  className,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  showAllLink = true,
  sectionHeadingId = "related-reports-heading",
  pageSize = DEFAULT_PAGE_SIZE,
}: Props) {
  const [page, setPage] = useState(1);
  const pageSizeClamped = Math.max(1, Math.min(50, pageSize));
  const postsKey = useMemo(() => posts.map((p) => p.id).join(","), [posts]);

  useEffect(() => {
    setPage(1);
  }, [postsKey]);

  const totalPages = Math.max(1, Math.ceil(posts.length / pageSizeClamped));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * pageSizeClamped;
  const visiblePosts = useMemo(
    () => posts.slice(sliceStart, sliceStart + pageSizeClamped),
    [posts, sliceStart, pageSizeClamped],
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  if (!posts.length) return null;

  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/98 to-white p-4 shadow-sm sm:p-6 ${className ?? ""}`}
      aria-labelledby={sectionHeadingId}
    >
      <div className="flex flex-wrap items-start gap-3 sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Layers className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id={sectionHeadingId} className="text-base font-bold text-slate-900 sm:text-lg">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">{description}</p>
          </div>
        </div>
        {showAllLink ? (
          <Link
            href="/news?section=report"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            전체 목록
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visiblePosts.map((post) => {
          const href = post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`;
          const kind = classifyReportKind(post);
          const badge = getReportBadgeLabel(post);
          const cardTitle = getReportCardListTitle(post);
          const dateLabel = post.published_at
            ? new Date(post.published_at).toLocaleDateString("ko-KR")
            : "";

          return (
            <li key={post.id}>
              <Link
                href={href}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] transition-shadow hover:border-indigo-200/80 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex max-w-[85%] shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${BADGE[kind]}`}
                  >
                    {badge}
                  </span>
                  <time className="shrink-0 text-[11px] text-slate-400 tabular-nums" dateTime={post.published_at ?? undefined}>
                    {dateLabel}
                  </time>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-indigo-800">
                  {cardTitle}
                </p>
                {post.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{post.excerpt}</p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 ? (
        <nav
          className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4"
          aria-label="관련 리포트 페이지"
        >
          <p className="text-xs text-slate-500 tabular-nums">
            {sliceStart + 1}–{Math.min(sliceStart + pageSizeClamped, posts.length)} / 전체 {posts.length}건 · 페이지 {safePage}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(Math.max(1, safePage - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
