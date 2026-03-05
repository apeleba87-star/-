"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type CategoryFilter = "all" | "cleaning" | "disinfection" | "both";

const LABELS: Record<CategoryFilter, string> = {
  all: "전체",
  cleaning: "청소만",
  disinfection: "소독·방역만",
  both: "청소+소독·방역",
};

export default function TendersListClient({ currentCategory }: { currentCategory: CategoryFilter }) {
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["both", "cleaning", "disinfection", "all"] as const).map((cat) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("category", cat);
        const isActive = currentCategory === cat;
        return (
          <Link
            key={cat}
            href={`/tenders?${next.toString()}`}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              isActive
                ? cat === "all"
                  ? "border-slate-500 bg-slate-100 text-slate-800"
                  : cat === "cleaning"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : cat === "disinfection"
                      ? "border-amber-500 bg-amber-50 text-amber-800"
                      : "border-blue-500 bg-blue-50 text-blue-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {LABELS[cat]}
          </Link>
        );
      })}
    </div>
  );
}
