"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import DemandMetricChart from "@/components/demand/DemandMetricChart";
import DemandRegionPicker from "@/components/demand/DemandRegionPicker";
import { DemandSearchIndexCell, DemandSearchVolumeCell } from "@/components/demand/DemandSearchMetricCell";
import DemandScopeSummaryStrip from "@/components/demand/DemandScopeSummaryStrip";
import DemandTradeMetricCell from "@/components/demand/DemandTradeMetricCell";
import { DEMAND_HUB_HERO, DEMAND_METRIC_LABELS } from "@/lib/demand/copy";
import { DEMAND_SNAPSHOT_META } from "@/lib/demand/dummy-data";
import { demandMetricChartTheme } from "@/lib/demand/metric-chart-theme";
import type { DemandMetricId } from "@/lib/demand/metrics";
import {
  DEMAND_MAX_REGION_COMPARE,
  demandRegionSelectionKey,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import {
  buildDemandScopeRowsWithRtms,
  type DemandRtmsDistrictOverrides,
  type DemandScopeTableRow,
} from "@/lib/demand/scope-data";
import type { DemandKeywordHubData } from "@/lib/demand/keyword-hub-data";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import { cn } from "@/lib/utils";

function ClickableMetricCell({
  metricId,
  active,
  onClick,
  children,
}: {
  metricId: DemandMetricId;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const theme = demandMetricChartTheme(metricId);
  return (
    <td className="px-3 py-2.5 text-right">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "rounded-md px-1.5 py-0.5 transition-colors",
          theme.cellHover,
          active && theme.cellActive
        )}
        aria-pressed={active}
      >
        {children}
      </button>
    </td>
  );
}

type Props = {
  rtmsOverrides?: DemandRtmsDistrictOverrides;
  rtmsBaseMonthLabel?: string | null;
  rtmsSeries?: DemandRtmsSeriesStore;
  keywordHub?: DemandKeywordHubData | null;
};

export default function DemandHubWorkspace({
  rtmsOverrides = {},
  rtmsBaseMonthLabel = null,
  rtmsSeries = {},
  keywordHub = null,
}: Props) {
  const [selections, setSelections] = useState<DemandRegionSelection[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<DemandMetricId | null>("jeonse");
  const [chartRowKey, setChartRowKey] = useState<string | null>(null);

  const scopeRows = useMemo(
    () => buildDemandScopeRowsWithRtms(selections, rtmsOverrides, keywordHub),
    [selections, rtmsOverrides, keywordHub]
  );
  const hasSelection = selections.length > 0;
  const primaryRow = scopeRows[0];

  const focusRowKey = useMemo(() => {
    if (scopeRows.length === 0) return null;
    if (chartRowKey && scopeRows.some((r) => demandRegionSelectionKey(r.selection) === chartRowKey)) {
      return chartRowKey;
    }
    return demandRegionSelectionKey(scopeRows[0].selection);
  }, [scopeRows, chartRowKey]);

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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-teal-100 bg-white p-4 shadow-sm ring-1 ring-teal-50">
        <p className="text-sm font-semibold text-slate-800">지역 찾기</p>
        <p className="mt-0.5 text-xs text-slate-500">{DEMAND_HUB_HERO.regionHint}</p>
        <DemandRegionPicker
          className="mt-3"
          selections={selections}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      </div>

      {hasSelection && primaryRow ? (
        <>
          <DemandScopeSummaryStrip
            rows={scopeRows}
            focusRowKey={focusRowKey}
            onFocusRow={setChartRowKey}
            selectedMetric={selectedMetric}
            onSelectMetric={(id) => {
              const row =
                scopeRows.find((r) => demandRegionSelectionKey(r.selection) === focusRowKey) ??
                primaryRow;
              if (row) selectMetric(row, id);
            }}
          />

          {selectedMetric && scopeRows.length > 0 ? (
            <DemandMetricChart
              rows={scopeRows}
              metricId={selectedMetric}
              focusRowKey={focusRowKey}
              rtmsSeries={rtmsSeries}
              keywordHub={keywordHub}
            />
          ) : null}
        </>
      ) : null}

      {!hasSelection ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
          지역을 추가하면 요약·비교표·그래프가 나타납니다
        </p>
      ) : scopeRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 py-8 text-center text-sm text-amber-900">
          데이터 준비 중입니다
        </p>
      ) : (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">
            {scopeRows.length > 1 ? "지역 비교표" : "지표 상세"}
            <span className="ml-2 font-normal text-slate-400">
              {scopeRows.length > 1 ? "셀 클릭 → 지표 · 그래프에 지역 겹침" : "셀 클릭 → 지표"}
            </span>
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
                  const isFocusRow = focusRowKey === rowKey;
                  return (
                    <tr
                      key={rowKey}
                      className={cn(
                        isFocusRow && selectedMetric && demandMetricChartTheme(selectedMetric).rowBg
                      )}
                    >
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
                        metricId="sale"
                        active={isFocusRow && selectedMetric === "sale"}
                        onClick={() => selectMetric(row, "sale")}
                      >
                        <DemandTradeMetricCell count={row.saleCount} momPercent={row.saleMom} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="jeonse"
                        active={isFocusRow && selectedMetric === "jeonse"}
                        onClick={() => selectMetric(row, "jeonse")}
                      >
                        <DemandTradeMetricCell count={row.jeonseCount} momPercent={row.jeonseMom} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="packingVolume"
                        active={isFocusRow && selectedMetric === "packingVolume"}
                        onClick={() => selectMetric(row, "packingVolume")}
                      >
                        <DemandSearchVolumeCell metric={row.packing} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="packingIndex"
                        active={isFocusRow && selectedMetric === "packingIndex"}
                        onClick={() => selectMetric(row, "packingIndex")}
                      >
                        <DemandSearchIndexCell metric={row.packing} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="moveInVolume"
                        active={isFocusRow && selectedMetric === "moveInVolume"}
                        onClick={() => selectMetric(row, "moveInVolume")}
                      >
                        <DemandSearchVolumeCell metric={row.moveInClean} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="moveInIndex"
                        active={isFocusRow && selectedMetric === "moveInIndex"}
                        onClick={() => selectMetric(row, "moveInIndex")}
                      >
                        <DemandSearchIndexCell metric={row.moveInClean} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="composite"
                        active={isFocusRow && selectedMetric === "composite"}
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
              {rtmsBaseMonthLabel ?? DEMAND_SNAPSHOT_META.baseMonthLabel} · 거래=RTMS · 검색지수=
              {keywordHub?.source.datalab === "live" ? "데이터랩(전국)" : "더미"} · 검색량=
              {keywordHub?.source.volume === "live" ? "검색광고(전국)" : "더미"}
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
    </div>
  );
}
