"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import DemandHubPulseSection from "@/components/demand/DemandHubPulseSection";
import DemandMetricChart from "@/components/demand/DemandMetricChart";
import DemandRegionPicker from "@/components/demand/DemandRegionPicker";
import DemandScopeCompareCards from "@/components/demand/DemandScopeCompareCards";
import { DemandSearchIndexCell, DemandSearchVolumeCell } from "@/components/demand/DemandSearchMetricCell";
import DemandScopeSummaryStrip from "@/components/demand/DemandScopeSummaryStrip";
import DemandTradeMetricCell from "@/components/demand/DemandTradeMetricCell";
import { DEMAND_HUB_HERO, DEMAND_METRIC_LABELS } from "@/lib/demand/copy";
import DemandHeatBadge from "@/components/demand/DemandHeatBadge";
import DemandDummyBadge from "@/components/demand/DemandDummyBadge";
import { formatDemandScoreBasis } from "@/lib/demand/district-demand-score";
import {
  type DemandScoreContext,
} from "@/lib/demand/seoul-demand-ranking";
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
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DailyPulseData } from "@/lib/demand/daily-pulse";
import { mergeDemandKeywordStores, mergeRtmsSeries } from "@/lib/demand/merge-demand-data";
import type { DemandRegionScopePayload } from "@/lib/demand/region-scope-data";
import { isDemandRegionScopeLoaded } from "@/lib/demand/region-scope-loaded";
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
  keywordStore?: DemandKeywordStore | null;
  scoreContext?: DemandScoreContext | null;
  dailyPulse?: DailyPulseData | null;
};

export default function DemandHubWorkspace({
  rtmsOverrides = {},
  rtmsBaseMonthLabel = null,
  rtmsSeries = {},
  keywordStore = null,
  scoreContext = null,
  dailyPulse = null,
}: Props) {
  const [selections, setSelections] = useState<DemandRegionSelection[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<DemandMetricId | null>("jeonse");
  const [chartRowKey, setChartRowKey] = useState<string | null>(null);
  const [keywordStoreState, setKeywordStoreState] = useState(keywordStore);
  const [rtmsSeriesState, setRtmsSeriesState] = useState(rtmsSeries);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setKeywordStoreState(keywordStore);
    setRtmsSeriesState(rtmsSeries);
  }, [keywordStore, rtmsSeries]);

  const liveScoreContext = useMemo(() => {
    if (!scoreContext) return null;
    return {
      ...scoreContext,
      keywordStore: keywordStoreState,
      rtmsSeries: rtmsSeriesState,
    };
  }, [scoreContext, keywordStoreState, rtmsSeriesState]);

  const ensureRegionScope = useCallback(
    async (sel: DemandRegionSelection) => {
      const key = demandRegionSelectionKey(sel);
      if (isDemandRegionScopeLoaded(sel, keywordStoreState, rtmsSeriesState)) return;

      setLoadingKeys((prev) => {
        if (prev.has(key)) return prev;
        return new Set(prev).add(key);
      });

      try {
        const res = await fetch("/api/demand/region-scope", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selections: [sel] }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as DemandRegionScopePayload;
        setKeywordStoreState((prev) =>
          mergeDemandKeywordStores(prev ?? { byRegion: {} }, data.keywordStore)
        );
        setRtmsSeriesState((prev) => mergeRtmsSeries(prev, data.rtmsSeries));
      } finally {
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [keywordStoreState, rtmsSeriesState]
  );

  const scopeRows = useMemo(
    () =>
      buildDemandScopeRowsWithRtms(
        selections,
        rtmsOverrides,
        keywordStoreState,
        liveScoreContext
      ),
    [selections, rtmsOverrides, keywordStoreState, liveScoreContext]
  );

  const keywordSourceSummary = useMemo(() => {
    if (!scopeRows.length) {
      return {
        packingIndex: "dummy" as const,
        moveInIndex: "dummy" as const,
        volume: "dummy" as const,
      };
    }
    const packingLive = scopeRows.some(
      (r) => (r.keywordIndexLevelByKey?.packing ?? "dummy") !== "dummy"
    );
    const moveInLive = scopeRows.some(
      (r) => (r.keywordIndexLevelByKey?.move_in_clean ?? "dummy") !== "dummy"
    );
    const volumeLive = scopeRows.some((r) => r.keywordSource?.volume === "live");
    return {
      packingIndex: packingLive ? ("live" as const) : ("dummy" as const),
      moveInIndex: moveInLive ? ("live" as const) : ("dummy" as const),
      volume: volumeLive ? ("live" as const) : ("dummy" as const),
    };
  }, [scopeRows]);
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
    void ensureRegionScope(sel);
  }

  function onRemove(key: string) {
    setSelections((prev) => {
      const next = prev.filter((s) => demandRegionSelectionKey(s) !== key);
      setChartRowKey((fk) => {
        if (fk && fk !== key && next.some((s) => demandRegionSelectionKey(s) === fk)) {
          return fk;
        }
        return next[0] ? demandRegionSelectionKey(next[0]) : null;
      });
      return next;
    });
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
    <div className="space-y-4">
      {dailyPulse ? <DemandHubPulseSection data={dailyPulse} compactOnMobile /> : null}

      <div className="rounded-2xl border-2 border-teal-100 bg-white p-4 shadow-sm ring-1 ring-teal-50">
        <p className="text-sm font-semibold text-slate-800">지역 찾기</p>
        <p className="mt-0.5 text-xs text-slate-500">{DEMAND_HUB_HERO.regionHint}</p>
        <DemandRegionPicker
          className="mt-3"
          selections={selections}
          onAdd={onAdd}
          onRemove={onRemove}
        />
        {loadingKeys.size > 0 ? (
          <p className="mt-2 text-xs text-teal-700" role="status">
            지역 데이터 불러오는 중…
          </p>
        ) : null}
      </div>

      {hasSelection && primaryRow ? (
        <>
          <div className="hidden md:block">
            <DemandScopeSummaryStrip
              rows={scopeRows}
              focusRowKey={focusRowKey}
              selectedMetric={selectedMetric}
              onSelectMetric={(id) => {
                const row =
                  scopeRows.find((r) => demandRegionSelectionKey(r.selection) === focusRowKey) ??
                  primaryRow;
                if (row) selectMetric(row, id);
              }}
            />
          </div>

          <DemandScopeCompareCards
            rows={scopeRows}
            focusRowKey={focusRowKey}
            selectedMetric={selectedMetric}
            onFocusRow={setChartRowKey}
            onSelectMetric={selectMetric}
            rtmsBaseMonthLabel={rtmsBaseMonthLabel}
          />

          {selectedMetric && scopeRows.length > 0 ? (
            <DemandMetricChart
              rows={scopeRows}
              metricId={selectedMetric}
              focusRowKey={focusRowKey}
              rtmsSeries={rtmsSeriesState}
              keywordStore={keywordStoreState}
            />
          ) : null}
        </>
      ) : null}

      {!hasSelection ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
          지역을 선택하면 비교·그래프가 나타납니다
        </p>
      ) : scopeRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 py-8 text-center text-sm text-amber-900">
          데이터 준비 중입니다
        </p>
      ) : (
        <div>
          <div className="hidden md:block">
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
                  <th className="px-3 py-2.5 font-medium">{DEMAND_METRIC_LABELS.demandScore}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.sale}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.jeonse}</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    {DEMAND_METRIC_LABELS.packingVolume}
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    {DEMAND_METRIC_LABELS.packingIndex}
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    {DEMAND_METRIC_LABELS.moveInVolume}
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    {DEMAND_METRIC_LABELS.moveInIndex}
                  </th>
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
                        {scopeRows.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => setChartRowKey(rowKey)}
                            className={cn(
                              "font-medium text-left transition-colors",
                              isFocusRow
                                ? "text-teal-900 underline decoration-teal-400 decoration-2 underline-offset-2"
                                : "text-slate-800 hover:text-teal-800"
                            )}
                            aria-pressed={isFocusRow}
                          >
                            {row.label}
                          </button>
                        ) : row.hasDetail && row.slug ? (
                          <Link
                            href={`/demand/region/${row.slug}`}
                            className="font-medium text-teal-800 hover:underline"
                          >
                            {row.label}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-800">{row.label}</span>
                        )}
                      </td>
                      <ClickableMetricCell
                        metricId="demandScore"
                        active={isFocusRow && selectedMetric === "demandScore"}
                        onClick={() => selectMetric(row, "demandScore")}
                      >
                        <div className="text-left">
                          <DemandHeatBadge
                            band={row.demandScore.band}
                            score={row.demandScore.score}
                            compact
                          />
                          <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                            {formatDemandScoreBasis(row.demandScore.basis)}
                          </p>
                        </div>
                      </ClickableMetricCell>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
              {rtmsBaseMonthLabel ?? DEMAND_SNAPSHOT_META.baseMonthLabel} · 거래=RTMS · 검색=전국 이사·입주청소 관련
              {keywordSourceSummary.volume !== "live" ? (
                <>
                  {" "}
                  <DemandDummyBadge />
                </>
              ) : null}
            </p>
          </div>
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
