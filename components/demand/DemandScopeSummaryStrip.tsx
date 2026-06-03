"use client";

import {
  DEMAND_COMPOSITE_ABOUT,
  DEMAND_COMPOSITE_CARD_SUB,
  DEMAND_COMPOSITE_METHOD_NOTE,
  DEMAND_METRIC_LABELS,
  DEMAND_PACKING_INTEREST_ABOUT,
  DEMAND_PACKING_INTEREST_CARD_SUB,
  formatMomPercent,
  formatSearchIndexPercent,
  formatSearchVolumeMonth,
} from "@/lib/demand/copy";
import {
  computePackingInterestScore,
  formatPackingInterestSub,
} from "@/lib/demand/packing-interest";
import { DemandRevealInline } from "@/components/demand/DemandReveal";
import { demandMetricChartTheme } from "@/lib/demand/metric-chart-theme";
import type { DemandMetricId } from "@/lib/demand/metrics";
import { demandRegionSelectionKey } from "@/lib/demand/regions";
import type { DemandScopeTableRow } from "@/lib/demand/scope-data";
import {
  demandKeywordIndexLevelHint,
  demandKeywordVolumeLevelHint,
} from "@/lib/demand/keyword-resolve";
import { demandShowPackingSearchBreakdown } from "@/lib/demand/feature-flags";
import DemandDevMetricBadge from "@/components/demand/DemandDevMetricBadge";
import SignalBadge from "@/components/demand/SignalBadge";
import { getDemandDistrictBySlug } from "@/lib/demand/dummy-data";
import { cn } from "@/lib/utils";
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
  label: ReactNode;
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
        accent && !selected && "border-teal-200 ring-1 ring-teal-100",
        !accent && !selected && "border-slate-200",
        selected && demandMetricChartTheme(metricId).cardSelected
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
  rows: DemandScopeTableRow[];
  focusRowKey?: string | null;
  selectedMetric: DemandMetricId | null;
  onSelectMetric: (id: DemandMetricId) => void;
};

export default function DemandScopeSummaryStrip({
  rows,
  focusRowKey,
  selectedMetric,
  onSelectMetric,
}: Props) {
  const compareMode = rows.length > 1;
  const cardRow =
    rows.find((r) => demandRegionSelectionKey(r.selection) === focusRowKey) ?? rows[0];
  if (!cardRow) return null;

  const district = cardRow.slug ? getDemandDistrictBySlug(cardRow.slug) : undefined;
  const packing = cardRow.packing;
  const moveIn = cardRow.moveInClean;
  const packingInterestHint = demandKeywordIndexLevelHint(
    cardRow.selection,
    cardRow.keywordIndexLevelByKey?.packing ?? cardRow.keywordIndexLevel ?? "dummy"
  );
  const moveInIndexHint = demandKeywordIndexLevelHint(
    cardRow.selection,
    cardRow.keywordIndexLevelByKey?.move_in_clean ?? cardRow.keywordIndexLevel ?? "dummy"
  );
  const moveInVolumeHint = demandKeywordVolumeLevelHint(
    cardRow.selection,
    cardRow.keywordVolumeLevelByKey?.move_in_clean ?? cardRow.keywordVolumeLevel ?? "dummy"
  );
  const packingVolumeHint = demandKeywordVolumeLevelHint(
    cardRow.selection,
    cardRow.keywordVolumeLevelByKey?.packing ?? cardRow.keywordVolumeLevel ?? "dummy"
  );
  const showPackingBreakdown = demandShowPackingSearchBreakdown();

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            {compareMode ? `${rows.length}개 지역 비교` : cardRow.pathLabel}
          </h2>
          {!compareMode && district ? <SignalBadge signal={district.signal} /> : null}
        </div>

        {compareMode ? (
          <p className="text-xs text-slate-500">
            카드 기준{" "}
            <span className="font-semibold text-slate-700">{cardRow.label}</span>
            <span className="text-slate-400"> · 비교표 행 클릭으로 변경</span>
          </p>
        ) : null}
      </div>

      <p className="text-[11px] text-slate-500">
        {compareMode
          ? "요약 카드는 강조된 지역 한 곳, 추이 그래프는 선택한 지역 전체입니다."
          : "지표를 누르면 아래에 추세 그래프가 표시됩니다."}
      </p>

      <div
        className={cn(
          "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",
          showPackingBreakdown ? "xl:grid-cols-8" : "xl:grid-cols-6"
        )}
      >
        <SummaryCard
          metricId="composite"
          label={DEMAND_METRIC_LABELS.composite}
          value={cardRow.indexScore ?? "—"}
          sub={DEMAND_COMPOSITE_CARD_SUB}
          accent
          selected={selectedMetric === "composite"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="sale"
          label="주택매매"
          value={`${cardRow.saleCount.toLocaleString("ko-KR")}건`}
          sub={formatMomPercent(cardRow.saleMom)}
          selected={selectedMetric === "sale"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="jeonse"
          label="전월세"
          value={`${cardRow.jeonseCount.toLocaleString("ko-KR")}건`}
          sub={formatMomPercent(cardRow.jeonseMom)}
          selected={selectedMetric === "jeonse"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="packingInterest"
          label={DEMAND_METRIC_LABELS.packingInterest}
          value={computePackingInterestScore(packing)}
          sub={`${DEMAND_PACKING_INTEREST_CARD_SUB}${packingInterestHint}`}
          keywordHint={compareMode ? undefined : packing.keyword}
          selected={selectedMetric === "packingInterest"}
          onSelect={onSelectMetric}
        />
        {showPackingBreakdown ? (
          <>
            <SummaryCard
              metricId="packingVolume"
              label={
                <>
                  {DEMAND_METRIC_LABELS.packingVolume}
                  <DemandDevMetricBadge />
                </>
              }
              value={
                packing.searchVolumeBelowTen
                  ? "<10"
                  : packing.searchVolumeMonth != null
                    ? formatSearchVolumeMonth(packing.searchVolumeMonth)
                    : "—"
              }
              sub={`검색광고 최근 30일${packingVolumeHint}`}
              keywordHint={compareMode ? undefined : packing.keyword}
              selected={selectedMetric === "packingVolume"}
              onSelect={onSelectMetric}
            />
            <SummaryCard
              metricId="packingIndex"
              label={
                <>
                  {DEMAND_METRIC_LABELS.packingIndex}
                  <DemandDevMetricBadge />
                </>
              }
              value={formatSearchIndexPercent(packing.indexDodPercent)}
              sub={`전일${packingInterestHint}`}
              keywordHint={compareMode ? undefined : packing.keyword}
              selected={selectedMetric === "packingIndex"}
              onSelect={onSelectMetric}
            />
          </>
        ) : null}
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
          sub={`검색광고 최근 30일${moveInVolumeHint}`}
          keywordHint={compareMode ? undefined : moveIn.keyword}
          selected={selectedMetric === "moveInVolume"}
          onSelect={onSelectMetric}
        />
        <SummaryCard
          metricId="moveInIndex"
          label="입주청소 검색지수"
          value={formatSearchIndexPercent(moveIn.indexDodPercent)}
          sub={`전일${moveInIndexHint}`}
          keywordHint={compareMode ? undefined : moveIn.keyword}
          selected={selectedMetric === "moveInIndex"}
          onSelect={onSelectMetric}
        />
      </div>

      {compareMode ? (
        <p className="truncate text-[10px] text-violet-600">
          검색어({cardRow.label}): {packing.keyword} · {moveIn.keyword}
        </p>
      ) : null}

      {selectedMetric === "composite" ? (
        <DemandRevealInline closedLabel="입주 온도 안내">
          <p className="text-[11px] leading-relaxed text-slate-600">{DEMAND_COMPOSITE_ABOUT}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{DEMAND_COMPOSITE_METHOD_NOTE}</p>
        </DemandRevealInline>
      ) : null}

      {selectedMetric === "packingInterest" ? (
        <DemandRevealInline closedLabel="관심지수 안내">
          <p className="text-[11px] leading-relaxed text-slate-600">
            {DEMAND_PACKING_INTEREST_ABOUT}
          </p>
        </DemandRevealInline>
      ) : null}
    </section>
  );
}
