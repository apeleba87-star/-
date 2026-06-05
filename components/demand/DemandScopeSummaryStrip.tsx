"use client";

import {
  DEMAND_METRIC_LABELS,
  DEMAND_RTMS_HERO_NOTE,
  DEMAND_SCOPE_SIMPLE_HINT,
  DEMAND_SCORE_ABOUT,
  DEMAND_SCORE_CARD_SUB,
  DEMAND_SEARCH_INDEX_CARD_SUB,
  DEMAND_SEARCH_METRICS_ABOUT,
  DEMAND_SEARCH_NATIONAL_BADGE,
  DEMAND_SEARCH_SECTION_LABEL,
  DEMAND_TRADE_SECTION_LABEL,
  formatMomPercent,
  formatSearchIndexPercent,
  formatSearchVolumeCardSub,
  formatSearchVolumeMonth,
} from "@/lib/demand/copy";
import { anchorVolumeFromMonthlySeries } from "@/lib/demand/search-volume-30d";
import { DemandRevealInline } from "@/components/demand/DemandReveal";
import { demandMetricChartTheme } from "@/lib/demand/metric-chart-theme";
import type { DemandMetricId } from "@/lib/demand/metrics";
import { demandRegionSelectionKey } from "@/lib/demand/regions";
import type { DemandScopeTableRow } from "@/lib/demand/scope-data";
import type { DemandKeywordIndexLevel } from "@/lib/demand/keyword-resolve";
import { demandShowPackingSearchBreakdown } from "@/lib/demand/feature-flags";
import DemandDevMetricBadge from "@/components/demand/DemandDevMetricBadge";
import DemandDummyBadge from "@/components/demand/DemandDummyBadge";
import DemandHeatBadge from "@/components/demand/DemandHeatBadge";
import { formatDemandScoreSimpleSummary } from "@/lib/demand/district-demand-score";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function SummaryCard({
  metricId,
  label,
  value,
  sub,
  fallbackHint,
  accent,
  rtmsHero,
  selected,
  isDummy,
  onSelect,
}: {
  metricId: DemandMetricId;
  label: ReactNode;
  value: ReactNode;
  sub?: string;
  fallbackHint?: string;
  accent?: boolean;
  rtmsHero?: boolean;
  selected: boolean;
  isDummy?: boolean;
  onSelect: (id: DemandMetricId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(metricId)}
      className={cn(
        "h-full rounded-xl border bg-white px-3 py-3 text-left transition-colors",
        rtmsHero && !selected && "border-slate-300 bg-slate-50/80",
        accent && !selected && !rtmsHero && "border-teal-200 ring-1 ring-teal-100",
        !accent && !rtmsHero && !selected && "border-slate-200",
        selected && demandMetricChartTheme(metricId).cardSelected
      )}
    >
      <p className="text-[11px] font-medium text-slate-500">
        {label}
        {isDummy ? <DemandDummyBadge /> : null}
      </p>
      <p
        className={cn(
          "mt-1 tabular-nums",
          rtmsHero
            ? "text-3xl font-black text-slate-900"
            : accent
              ? "text-2xl font-black text-teal-800"
              : "text-lg font-bold text-slate-900"
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p> : null}
      {fallbackHint ? (
        <p className="mt-0.5 text-[10px] text-amber-700">{fallbackHint}</p>
      ) : null}
    </button>
  );
}

function isDummyLevel(level: DemandKeywordIndexLevel | undefined): boolean {
  return level === "dummy";
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

  const packing = cardRow.packing;
  const moveIn = cardRow.moveInClean;
  const isDistrict = cardRow.selection.scope === "district";
  const showPackingBreakdown = demandShowPackingSearchBreakdown();
  const volumeLive = cardRow.keywordSource?.volume === "live";

  const packingVolumeLevel =
    cardRow.keywordVolumeLevelByKey?.packing ?? cardRow.keywordVolumeLevel ?? "dummy";
  const moveInVolumeLevel =
    cardRow.keywordVolumeLevelByKey?.move_in_clean ?? cardRow.keywordVolumeLevel ?? "dummy";
  const packingIndexLevel =
    cardRow.keywordIndexLevelByKey?.packing ?? cardRow.keywordIndexLevel ?? "dummy";
  const moveInIndexLevel =
    cardRow.keywordIndexLevelByKey?.move_in_clean ?? cardRow.keywordIndexLevel ?? "dummy";

  const packingAnchor = anchorVolumeFromMonthlySeries(cardRow.keywordVolumeMonthlySeries?.packing);
  const moveInAnchor = anchorVolumeFromMonthlySeries(
    cardRow.keywordVolumeMonthlySeries?.move_in_clean
  );

  const rollingVolume = cardRow.searchVolumeDisplaySource === "rolling_30d";
  const packingVolLive =
    volumeLive && (rollingVolume || packingAnchor != null || packing.searchVolumeBelowTen);
  const moveInVolLive =
    volumeLive && (rollingVolume || moveInAnchor != null || moveIn.searchVolumeBelowTen);

  const packingVolSub = formatSearchVolumeCardSub({
    isDistrict,
    displaySource: cardRow.searchVolumeDisplaySource,
    rollingSnapshotDate: cardRow.searchVolumeRollingSnapshotDate,
    monthPeriodLabel: packingAnchor?.monthLabel ?? null,
    live: packingVolLive,
  });
  const moveInVolSub = formatSearchVolumeCardSub({
    isDistrict,
    displaySource: cardRow.searchVolumeDisplaySource,
    rollingSnapshotDate: cardRow.searchVolumeRollingSnapshotDate,
    monthPeriodLabel: moveInAnchor?.monthLabel ?? null,
    live: moveInVolLive,
  });

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            {compareMode ? `${rows.length}개 지역 비교` : cardRow.pathLabel}
          </h2>
          {!compareMode ? (
            <DemandHeatBadge band={cardRow.demandScore.band} score={cardRow.demandScore.score} />
          ) : null}
        </div>
        {!compareMode ? (
          <p className="text-xs leading-relaxed text-slate-600">
            {formatDemandScoreSimpleSummary(cardRow.demandScore)}
          </p>
        ) : null}
        {compareMode ? (
          <p className="text-xs text-slate-500">
            카드 기준 <span className="font-semibold text-slate-700">{cardRow.label}</span>
          </p>
        ) : null}
        {isDistrict ? (
          <p className="text-xs leading-relaxed text-slate-500">{DEMAND_RTMS_HERO_NOTE}</p>
        ) : null}
        <p className="text-[11px] text-slate-400">{DEMAND_SCOPE_SIMPLE_HINT}</p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {DEMAND_TRADE_SECTION_LABEL}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <SummaryCard
            metricId="jeonse"
            label={DEMAND_METRIC_LABELS.jeonse}
            value={`${cardRow.jeonseCount.toLocaleString("ko-KR")}건`}
            sub={`전월 대비 ${formatMomPercent(cardRow.jeonseMom)}`}
            rtmsHero={isDistrict}
            selected={selectedMetric === "jeonse"}
            onSelect={onSelectMetric}
          />
          <SummaryCard
            metricId="sale"
            label={DEMAND_METRIC_LABELS.sale}
            value={`${cardRow.saleCount.toLocaleString("ko-KR")}건`}
            sub={`전월 대비 ${formatMomPercent(cardRow.saleMom)}`}
            rtmsHero={isDistrict}
            selected={selectedMetric === "sale"}
            onSelect={onSelectMetric}
          />
          <SummaryCard
            metricId="demandScore"
            label={DEMAND_METRIC_LABELS.demandScore}
            value={cardRow.demandScore.score}
            sub={DEMAND_SCORE_CARD_SUB}
            accent
            selected={selectedMetric === "demandScore"}
            onSelect={onSelectMetric}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {DEMAND_SEARCH_SECTION_LABEL}
          </p>
          {isDistrict ? (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {DEMAND_SEARCH_NATIONAL_BADGE}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryCard
            metricId="packingVolume"
            label={DEMAND_METRIC_LABELS.packingVolume}
            value={
              packing.searchVolumeBelowTen
                ? "<10"
                : packing.searchVolumeMonth != null
                  ? formatSearchVolumeMonth(packing.searchVolumeMonth)
                  : "—"
            }
            sub={packingVolSub}
            selected={selectedMetric === "packingVolume"}
            isDummy={isDummyLevel(packingVolumeLevel)}
            onSelect={onSelectMetric}
          />
          <SummaryCard
            metricId="packingIndex"
            label={DEMAND_METRIC_LABELS.packingIndex}
            value={formatSearchIndexPercent(packing.indexDodPercent)}
            sub={DEMAND_SEARCH_INDEX_CARD_SUB}
            selected={selectedMetric === "packingIndex"}
            isDummy={isDummyLevel(packingIndexLevel)}
            onSelect={onSelectMetric}
          />
          <SummaryCard
            metricId="moveInVolume"
            label={DEMAND_METRIC_LABELS.moveInVolume}
            value={
              moveIn.searchVolumeBelowTen
                ? "<10"
                : moveIn.searchVolumeMonth != null
                  ? formatSearchVolumeMonth(moveIn.searchVolumeMonth)
                  : "—"
            }
            sub={moveInVolSub}
            selected={selectedMetric === "moveInVolume"}
            isDummy={isDummyLevel(moveInVolumeLevel)}
            onSelect={onSelectMetric}
          />
          <SummaryCard
            metricId="moveInIndex"
            label={DEMAND_METRIC_LABELS.moveInIndex}
            value={formatSearchIndexPercent(moveIn.indexDodPercent)}
            sub={DEMAND_SEARCH_INDEX_CARD_SUB}
            selected={selectedMetric === "moveInIndex"}
            isDummy={isDummyLevel(moveInIndexLevel)}
            onSelect={onSelectMetric}
          />
        </div>
      </div>

      {showPackingBreakdown ? (
        <p className="text-[10px] text-slate-400">
          관리자 검증용 상세 열은 비교표에서 확인
          <DemandDevMetricBadge />
        </p>
      ) : null}

      {selectedMetric === "demandScore" ? (
        <DemandRevealInline closedLabel="지역수요점수 안내">
          <p className="text-[11px] leading-relaxed text-slate-600">{DEMAND_SCORE_ABOUT}</p>
        </DemandRevealInline>
      ) : null}

      {(selectedMetric === "packingVolume" ||
        selectedMetric === "moveInVolume" ||
        selectedMetric === "packingIndex" ||
        selectedMetric === "moveInIndex") && (
        <DemandRevealInline closedLabel="검색 지표 안내">
          <div className="space-y-2">
            {DEMAND_SEARCH_METRICS_ABOUT.map((line) => (
              <p key={line} className="text-[11px] leading-relaxed text-slate-600">
                {line}
              </p>
            ))}
          </div>
        </DemandRevealInline>
      )}
    </section>
  );
}
