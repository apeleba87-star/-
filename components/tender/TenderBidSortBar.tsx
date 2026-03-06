"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type SortOption = "closing" | "amount" | "region" | "today";

const LABELS: Record<SortOption, string> = {
  closing: "마감 임박순",
  amount: "금액 높은순",
  region: "지역순",
  today: "오늘 공고순",
};

export default function TenderBidSortBar({
  currentSort,
  currentCategory,
}: {
  currentSort: SortOption;
  currentCategory: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setSort = (sort: SortOption) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("sort", sort);
    if (currentCategory) next.set("category", currentCategory);
    router.push(`/tenders?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-500">정렬</span>
      {(Object.keys(LABELS) as SortOption[]).map((sort) => (
        <button
          key={sort}
          type="button"
          onClick={() => setSort(sort)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            currentSort === sort
              ? "border-slate-700 bg-slate-800 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {LABELS[sort]}
        </button>
      ))}
    </div>
  );
}
