import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DemandDistrictScore } from "@/lib/demand/types";

export default function DemandMoverRow({ district }: { district: DemandDistrictScore }) {
  return (
    <Link
      href={`/demand/region/${district.slug}`}
      className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 ring-1 ring-slate-100/80 hover:border-slate-300"
    >
      <span className="font-bold text-slate-900">{district.gu}</span>
      <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
        +{district.rankDelta}
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </span>
    </Link>
  );
}
