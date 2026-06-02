"use client";

import Link from "next/link";
import { useState } from "react";
import SignalBadge from "@/components/demand/SignalBadge";
import { DemandRevealInline } from "@/components/demand/DemandReveal";
import { DEMAND_METRIC_LABELS, formatRankChange } from "@/lib/demand/copy";
import type { DemandDistrictScore } from "@/lib/demand/types";

export default function DemandIndexHero({ district }: { district: DemandDistrictScore }) {
  const [showIndex, setShowIndex] = useState(false);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md ring-1 ring-slate-100/80 sm:p-8">
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{district.gu}</h2>

      {!showIndex ? (
        <button
          type="button"
          onClick={() => setShowIndex(true)}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 px-5 text-sm font-semibold text-teal-900 hover:bg-teal-50"
        >
          {DEMAND_METRIC_LABELS.composite} 확인
        </button>
      ) : (
        <div className="mt-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-black tabular-nums text-teal-700 sm:text-5xl">{district.indexScore}</span>
            <SignalBadge signal={district.signal} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-lg bg-slate-100 px-3 py-1 font-medium">
              서울 <strong className="text-slate-900">{district.rank}위</strong>
            </span>
            <span className="rounded-lg bg-slate-100 px-3 py-1 font-medium">
              {formatRankChange(district.prevRank, district.rank)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-slate-100 pt-4">
        <DemandRevealInline closedLabel="해석 · 참고 보기">
          <div className="space-y-2 text-sm text-slate-700">
            <p>{district.drilldownExtra.insightLine}</p>
            {district.drilldownExtra.referenceLine ? (
              <p className="font-medium text-teal-800">{district.drilldownExtra.referenceLine}</p>
            ) : null}
          </div>
        </DemandRevealInline>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/demand/compare?gu1=${district.slug}&gu2=${district.drilldownExtra.neighborRanks[0]?.slug ?? "yangcheon-gu"}&gu3=${district.drilldownExtra.neighborRanks[1]?.slug ?? "mapo-gu"}`}
          className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-teal-200"
        >
          다른 구와 비교
        </Link>
      </div>
    </div>
  );
}
