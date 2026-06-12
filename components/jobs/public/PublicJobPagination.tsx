"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PUBLIC_JOB_PAGE_SIZE,
  publicJobPageCount,
} from "@/lib/jobs-public/public-job-pagination";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalCount: number;
};

export default function PublicJobPagination({ page, totalCount }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCount = publicJobPageCount(totalCount);
  if (pageCount <= 1) return null;

  const buildHref = (p: number) => {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const q = next.toString();
    return q ? `${pathname}?${q}` : pathname;
  };

  const pageClamped = Math.min(Math.max(1, page), pageCount);
  const from = (pageClamped - 1) * PUBLIC_JOB_PAGE_SIZE + 1;
  const to = Math.min(pageClamped * PUBLIC_JOB_PAGE_SIZE, totalCount);

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
      aria-label="공고 페이지"
    >
      <span className="text-sm text-slate-500">
        {from.toLocaleString("ko-KR")}–{to.toLocaleString("ko-KR")} /{" "}
        {totalCount.toLocaleString("ko-KR")}건
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={pageClamped <= 1 ? "#" : buildHref(pageClamped - 1)}
          scroll={pageClamped > 1}
          className={cn(
            "inline-flex min-h-[44px] items-center rounded-xl border-2 px-4 text-base font-semibold",
            pageClamped <= 1
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
          )}
          aria-disabled={pageClamped <= 1}
        >
          이전
        </Link>
        <span className="min-w-[4.5rem] text-center text-base font-medium text-slate-600">
          {pageClamped} / {pageCount}
        </span>
        <Link
          href={pageClamped >= pageCount ? "#" : buildHref(pageClamped + 1)}
          scroll={pageClamped < pageCount}
          className={cn(
            "inline-flex min-h-[44px] items-center rounded-xl border-2 px-4 text-base font-semibold",
            pageClamped >= pageCount
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
          )}
          aria-disabled={pageClamped >= pageCount}
        >
          다음
        </Link>
      </div>
    </nav>
  );
}
