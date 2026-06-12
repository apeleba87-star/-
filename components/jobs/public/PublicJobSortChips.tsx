"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import {
  PUBLIC_JOB_SORT_OPTIONS,
  type PublicJobSort,
} from "@/lib/jobs-public/public-job-sort";
import { cn } from "@/lib/utils";

type Props = {
  currentSort: PublicJobSort;
  jobCount: number;
};

export default function PublicJobSortChips({ currentSort, jobCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setSort = useCallback(
    (sort: PublicJobSort) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.set("sort", sort);
      next.delete("page");
      const q = next.toString();
      router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="mt-6 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          {PUBLIC_JOBS_COPY.feedTitle}
          {jobCount > 0 ? (
            <span className="ml-2 text-lg font-semibold text-slate-500">
              {jobCount.toLocaleString("ko-KR")}
              {PUBLIC_JOBS_COPY.regionCountSuffix}
            </span>
          ) : null}
        </h2>
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="공고 정렬"
        >
          {PUBLIC_JOB_SORT_OPTIONS.map((opt) => {
            const active = currentSort === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSort(opt.value)}
                className={cn(
                  "min-h-[44px] rounded-xl px-4 py-2 text-base font-semibold transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      {currentSort === "pay" || currentSort === "pay_asc" ? (
        <p className="text-sm leading-relaxed text-slate-500">
          {PUBLIC_JOBS_COPY.paySortNote}
        </p>
      ) : null}
    </div>
  );
}
