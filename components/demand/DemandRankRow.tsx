import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DemandDistrictScore } from "@/lib/demand/types";

/** 목록: 구 이름만 — 수치는 상세에서 */
export default function DemandRankRow({
  district,
  showRank = true,
}: {
  district: DemandDistrictScore;
  showRank?: boolean;
}) {
  return (
    <Link
      href={`/demand/region/${district.slug}`}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-100/80 transition hover:border-slate-300 sm:px-5"
    >
      {showRank ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-sm font-bold text-slate-700">
          {district.rank}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-base font-bold text-slate-900 group-hover:text-teal-800">
        {district.gu}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-teal-600" aria-hidden />
    </Link>
  );
}
