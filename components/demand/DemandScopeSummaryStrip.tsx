"use client";

import { formatMomPercent, formatSearchIndexPercent, formatSearchVolumeMonth } from "@/lib/demand/copy";
import type { DemandMetricId } from "@/lib/demand/metrics";
import type { DemandScopeTableRow } from "@/lib/demand/scope-data";
import SignalBadge from "@/components/demand/SignalBadge";
import { getDemandDistrictBySlug } from "@/lib/demand/dummy-data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

function SummaryCard({
  metricId,
  label,
  value,
  sub,
  keywordHint,
  accent,
  selected,
  onSelect,
}: {
  metricId: DemandMetricId;
  label: string;
  value: ReactNode;
  sub?: string;
  keywordHint?: string;
  accent?: boolean;
  selected: boolean;
  onSelect: (id: DemandMetricId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(metricId)}
      className={cn(
        "rounded-xl border bg-white px-3 py-3 text-left transition-colors",
        accent ? "border-teal-200 ring-1 ring-teal-100" : "border-slate-200",
        selected && "border-teal-500 ring-2 ring-teal-200"
      )}
    >
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 tabular-nums",
          accent ? "text-2xl font-black text-teal-800" : "text-lg font-bold text-slate-900"
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p> : null}
      {keywordHint ? (
        <p className="mt-0.5 truncate text-[10px] text-violet-600">{keywordHint}</p>
      ) : null}
    </button>
  );
}

type Props = {
  row: DemandScopeTableRow;
  selectedMetric: DemandMetricId | null;
  onSelectMetric: (id: DemandMetricId) => void;
};

export default function DemandScopeSummaryStrip({ row, selectedMetric, onSelectMetric }: Props) {
  const district = row.slug ? getDemandDistrictBySlug(row.slug) : undefined;
  const packing = row.packing;
  const moveIn = row.moveInClean;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-slate-900">{row.pathLabel}</h2>
        {district ? <SignalBadge signal={district.signal} /> : null}
        {row.hasDetail && row.slug ? (
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

      <p className="text-[11px] text-slate-500">지표를 누르면 아래에 추세 그래프가 표시됩니다.</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <SummaryCard
          metricId="composite"
          label="입주수요지수"
          value={row.indexScore ?? "—"}
          sub="종합 (더미)"
          accent
          selected={selectedMetric === "composite"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="sale"
          label="주택매매"
          value={`${row.saleCount.toLocaleString("ko-KR")}건`}
          sub={formatMomPercent(row.saleMom)}
          selected={selectedMetric === "sale"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="jeonse"
          label="전월세"
          value={`${row.jeonseCount.toLocaleString("ko-KR")}건`}
          sub={formatMomPercent(row.jeonseMom)}
          selected={selectedMetric === "jeonse"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="packingVolume"
          label="포장이사 검색량"
          value={
            packing.searchVolumeBelowTen
              ? "<10"
              : packing.searchVolumeMonth != null
                ? formatSearchVolumeMonth(packing.searchVolumeMonth)
                : "—"
          }
          sub="최근 30일"
          keywordHint={packing.keyword}
          selected={selectedMetric === "packingVolume"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="packingIndex"
          label="포장이사 검색지수"
          value={formatSearchIndexPercent(packing.indexDodPercent)}
          sub="전일"
          keywordHint={packing.keyword}
          selected={selectedMetric === "packingIndex"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="moveInVolume"
          label="입주청소 검색량"
          value={
            moveIn.searchVolumeBelowTen
              ? "<10"
              : moveIn.searchVolumeMonth != null
                ? formatSearchVolumeMonth(moveIn.searchVolumeMonth)
                : "—"
          }
          sub="최근 30일"
          keywordHint={moveIn.keyword}
          selected={selectedMetric === "moveInVolume"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="moveInIndex"
          label="입주청소 검색지수"
          value={formatSearchIndexPercent(moveIn.indexDodPercent)}
          sub="전일"
          keywordHint={moveIn.keyword}
          selected={selectedMetric === "moveInIndex"}
          onSelect={onSelectMetric}
        />
      </div>
    </section>
  );
}
