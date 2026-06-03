import type { ReactNode } from "react";
import Link from "next/link";
import {
  DEMAND_COMPOSITE_CARD_SUB,
  DEMAND_METRIC_LABELS,
  DEMAND_PACKING_INTEREST_CARD_SUB,
  formatMomPercent,
  formatSearchIndexPercent,
} from "@/lib/demand/copy";
import { demandShowPackingSearchBreakdown } from "@/lib/demand/feature-flags";
import { computePackingInterestScore, formatPackingInterestSub } from "@/lib/demand/packing-interest";
import DemandDevMetricBadge from "@/components/demand/DemandDevMetricBadge";
import SignalBadge from "@/components/demand/SignalBadge";
import type { DemandDistrictScore } from "@/lib/demand/types";
import type { DemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";
import type { DemandDistrictTableRow } from "@/lib/demand/table-data";
import { cn } from "@/lib/utils";

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white px-3 py-3",
        accent ? "border-teal-200 ring-1 ring-teal-100" : "border-slate-200"
      )}
    >
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 tabular-nums", accent ? "text-2xl font-black text-teal-800" : "text-lg font-bold text-slate-900")}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  );
}

type Props = {
  row: DemandDistrictTableRow;
  district?: DemandDistrictScore;
  keywordMetrics: DemandNationalKeywordMetrics;
  pathLabel: string;
};

export default function DemandDistrictSummaryStrip({ row, district, keywordMetrics, pathLabel }: Props) {
  const showPackingBreakdown = demandShowPackingSearchBreakdown();
  const packing = keywordMetrics.packing;
  const moveIn = keywordMetrics.moveInClean;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-slate-900">{pathLabel}</h2>
        {district ? <SignalBadge signal={district.signal} /> : null}
        {row.hasDetail ? (
          <Link
            href={`/demand/region/${row.slug}`}
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            상세 보기
          </Link>
        ) : null}
        {district ? (
          <span className="text-xs text-slate-400">
            서울 {district.rank}위 · 전월 {district.prevRank}위
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-2 sm:grid-cols-3",
          showPackingBreakdown ? "lg:grid-cols-7" : "lg:grid-cols-5"
        )}
      >
        <SummaryCard
          label={DEMAND_METRIC_LABELS.composite}
          value={row.indexScore ?? "—"}
          sub={DEMAND_COMPOSITE_CARD_SUB}
          accent
        />
        <SummaryCard
          label="주택매매"
          value={`${row.saleCount.toLocaleString("ko-KR")}건`}
          sub={formatMomPercent(row.saleMom)}
        />
        <SummaryCard
          label="전월세"
          value={`${row.jeonseCount.toLocaleString("ko-KR")}건`}
          sub={formatMomPercent(row.jeonseMom)}
        />
        <SummaryCard
          label={DEMAND_METRIC_LABELS.packingInterest}
          value={computePackingInterestScore(packing)}
          sub={`${DEMAND_PACKING_INTEREST_CARD_SUB} · ${formatPackingInterestSub(packing)}`}
        />
        {showPackingBreakdown ? (
          <>
            <SummaryCard
              label={
                <>
                  {DEMAND_METRIC_LABELS.packingVolume}
                  <DemandDevMetricBadge />
                </>
              }
              value={
                packing.searchVolumeMonth != null
                  ? packing.searchVolumeMonth.toLocaleString("ko-KR")
                  : "<10"
              }
              sub="전월 · 전국"
            />
            <SummaryCard
              label={
                <>
                  {DEMAND_METRIC_LABELS.packingIndex}
                  <DemandDevMetricBadge />
                </>
              }
              value={formatSearchIndexPercent(packing.indexDodPercent)}
              sub="전일 · 전국"
            />
          </>
        ) : null}
        <SummaryCard
          label="입주청소 검색량"
          value={
            moveIn.searchVolumeMonth != null
              ? moveIn.searchVolumeMonth.toLocaleString("ko-KR")
              : "<10"
          }
          sub="전월 · 전국"
        />
      </div>
    </section>
  );
}
