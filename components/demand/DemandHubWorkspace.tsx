"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import DemandMetricChart from "@/components/demand/DemandMetricChart";
import DemandNeighborSuggest from "@/components/demand/DemandNeighborSuggest";
import DemandPopularGuChips from "@/components/demand/DemandPopularGuChips";
import DemandRegionPicker from "@/components/demand/DemandRegionPicker";
import { DemandSearchIndexCell, DemandSearchVolumeCell } from "@/components/demand/DemandSearchMetricCell";
import DemandScopeSummaryStrip from "@/components/demand/DemandScopeSummaryStrip";
import DemandSearchPulseBar from "@/components/demand/DemandSearchPulseBar";
import DemandTradeMetricCell from "@/components/demand/DemandTradeMetricCell";
import { DEMAND_METRIC_LABELS } from "@/lib/demand/copy";
import { DEMAND_SNAPSHOT_META, getDemandDistrictBySlug } from "@/lib/demand/dummy-data";
import type { DemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";
import type { DemandMetricId } from "@/lib/demand/metrics";
import {
  DEMAND_MAX_REGION_COMPARE,
  demandRegionSelectionKey,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { buildDemandScopeRows, type DemandScopeTableRow } from "@/lib/demand/scope-data";
import { cn } from "@/lib/utils";

function ClickableMetricCell({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <td className="px-3 py-2.5 text-right">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "rounded-md px-1.5 py-0.5 transition-colors hover:bg-teal-50",
          active && "bg-teal-100 ring-1 ring-teal-300"
        )}
        aria-pressed={active}
      >
        {children}
      </button>
    </td>
  );
}

type Props = {
  keywordMetrics: DemandNationalKeywordMetrics;
};

export default function DemandHubWorkspace({ keywordMetrics }: Props) {
  const [selections, setSelections] = useState<DemandRegionSelection[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<DemandMetricId | null>("jeonse");
  const [chartRowKey, setChartRowKey] = useState<string | null>(null);

  const scopeRows = useMemo(() => buildDemandScopeRows(selections), [selections]);
  const hasSelection = selections.length > 0;
  const primaryRow = scopeRows[0];

  const chartRow = useMemo(() => {
    if (scopeRows.length === 0) return null;
    if (chartRowKey) {
      return scopeRows.find((r) => demandRegionSelectionKey(r.selection) === chartRowKey) ?? primaryRow;
    }
    return primaryRow;
  }, [scopeRows, chartRowKey, primaryRow]);

  function onAdd(sel: DemandRegionSelection) {
    const key = demandRegionSelectionKey(sel);
    setSelections((prev) => {
      if (prev.some((s) => demandRegionSelectionKey(s) === key)) return prev;
      if (prev.length >= DEMAND_MAX_REGION_COMPARE) return prev;
      return [...prev, sel];
    });
    if (selections.length === 0) setChartRowKey(key);
  }

  function onRemove(key: string) {
    setSelections((prev) => prev.filter((s) => demandRegionSelectionKey(s) !== key));
    if (chartRowKey === key) setChartRowKey(null);
  }

  function selectMetric(row: DemandScopeTableRow, metricId: DemandMetricId) {
    setSelectedMetric(metricId);
    setChartRowKey(demandRegionSelectionKey(row.selection));
  }

  const compareHref =
    scopeRows.length >= 2
      ? `/demand/compare?${scopeRows
          .slice(0, DEMAND_MAX_REGION_COMPARE)
          .filter((r) => r.slug)
          .map((r, i) => `gu${i + 1}=${encodeURIComponent(r.slug!)}`)
          .join("&")}`
      : null;

  const primaryDistrict = primaryRow?.slug ? getDemandDistrictBySlug(primaryRow.slug) : undefined;

  return (
    <div className="space-y-5">
      <DemandSearchPulseBar metrics={keywordMetrics} />

      <div className="rounded-2xl border-2 border-teal-100 bg-white p-4 shadow-sm ring-1 ring-teal-50">
        <p className="text-sm font-semibold text-slate-800">지역 찾기</p>
        <p className="mt-0.5 text-xs text-slate-500">
          전국 · 서울 전체 · 서울 &gt; 구 · 최대 {DEMAND_MAX_REGION_COMPARE}곳 비교
        </p>
        <DemandRegionPicker
          className="mt-3"
          selections={selections}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      </div>

      {!hasSelection ? <DemandPopularGuChips selections={selections} onAdd={onAdd} /> : null}

      {hasSelection && primaryRow ? (
        <>
          <DemandScopeSummaryStrip
            row={primaryRow}
            selectedMetric={selectedMetric}
            onSelectMetric={(id) => selectMetric(primaryRow, id)}
          />

          {primaryDistrict?.drilldownExtra.similarGu ? (
            <DemandNeighborSuggest
              similarGu={primaryDistrict.drilldownExtra.similarGu}
              selections={selections}
              onAdd={onAdd}
            />
          ) : null}

          {selectedMetric && chartRow ? (
            <DemandMetricChart row={chartRow} metricId={selectedMetric} />
          ) : null}
        </>
      ) : null}

      {!hasSelection ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
          <Search className="mx-auto mb-2 h-5 w-5 text-slate-300" aria-hidden />
          지역을 추가하면 요약·비교표·그래프가 표시됩니다
        </p>
      ) : scopeRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 py-8 text-center text-sm text-amber-900">
          데이터 준비 중입니다
        </p>
      ) : (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">
            {scopeRows.length > 1 ? "지역 비교표" : "지표 상세"}
            <span className="ml-2 font-normal text-slate-400">셀 클릭 → 그래프</span>
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-600">
                  <th className="px-3 py-2.5 font-medium">지역</th>
                  <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.sale}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.jeonse}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.packingVolume}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.packingIndex}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.moveInVolume}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.moveInIndex}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.composite}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopeRows.map((row) => {
                  const rowKey = demandRegionSelectionKey(row.selection);
                  const isChartRow =
                    chartRow != null && demandRegionSelectionKey(chartRow.selection) === rowKey;
                  return (
                    <tr key={rowKey} className={cn(isChartRow && "bg-teal-50/40")}>
                      <td className="px-3 py-2.5">
                        {row.hasDetail && row.slug ? (
                          <Link
                            href={`/demand/region/${row.slug}`}
                            className="font-medium text-teal-800 hover:underline"
                          >
                            {row.label}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-800">{row.label}</span>
                        )}
                        <p className="mt-0.5 truncate text-[10px] text-violet-600">{row.packing.keyword}</p>
                      </td>
                      <ClickableMetricCell
                        active={isChartRow && selectedMetric === "sale"}
                        onClick={() => selectMetric(row, "sale")}
                      >
                        <DemandTradeMetricCell compact count={row.saleCount} momPercent={row.saleMom} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        active={isChartRow && selectedMetric === "jeonse"}
                        onClick={() => selectMetric(row, "jeonse")}
                      >
                        <DemandTradeMetricCell compact count={row.jeonseCount} momPercent={row.jeonseMom} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        active={isChartRow && selectedMetric === "packingVolume"}
                        onClick={() => selectMetric(row, "packingVolume")}
                      >
                        <DemandSearchVolumeCell metric={row.packing} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        active={isChartRow && selectedMetric === "packingIndex"}
                        onClick={() => selectMetric(row, "packingIndex")}
                      >
                        <DemandSearchIndexCell metric={row.packing} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        active={isChartRow && selectedMetric === "moveInVolume"}
                        onClick={() => selectMetric(row, "moveInVolume")}
                      >
                        <DemandSearchVolumeCell metric={row.moveInClean} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        active={isChartRow && selectedMetric === "moveInIndex"}
                        onClick={() => selectMetric(row, "moveInIndex")}
                      >
                        <DemandSearchIndexCell metric={row.moveInClean} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        active={isChartRow && selectedMetric === "composite"}
                        onClick={() => selectMetric(row, "composite")}
                      >
                        <span className="font-semibold tabular-nums text-teal-800">
                          {row.indexScore ?? "—"}
                        </span>
                      </ClickableMetricCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
              {DEMAND_SNAPSHOT_META.baseMonthLabel} · 거래=RTMS(구/합산) · 검색량=키워드별 30일(더미) ·
              검색지수=데이터랩(더미)
            </p>
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            {primaryRow?.hasDetail && primaryRow.slug ? (
              <Link
                href={`/demand/region/${primaryRow.slug}`}
                className="font-semibold text-teal-700 hover:underline"
              >
                {primaryRow.label} 상세
              </Link>
            ) : null}
            {compareHref ? (
              <>
                {" · "}
                <Link href={compareHref} className="font-semibold text-slate-600 hover:underline">
                  비교 화면
                </Link>
              </>
            ) : null}
          </p>
        </div>
      )}

      <details className="rounded-xl border border-slate-200 bg-slate-50/50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-600">
          탐험 더보기 · TOP10 · 적중
        </summary>
        <div className="space-y-2 border-t border-slate-200 px-4 py-3 text-sm">
          <Link href="/demand/top" className="block text-teal-700 hover:underline">
            이번 달 입주수요 TOP10
          </Link>
          <Link href="/demand/movers" className="block text-teal-700 hover:underline">
            급상승 구역
          </Link>
          <Link href="/demand/hits" className="block text-teal-700 hover:underline">
            적중 아카이브
          </Link>
        </div>
      </details>
    </div>
  );
}
