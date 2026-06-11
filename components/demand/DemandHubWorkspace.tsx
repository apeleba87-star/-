"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import DemandHubPulseSection from "@/components/demand/DemandHubPulseSection";
import DemandHubJobWageSlimLink from "@/components/demand/DemandHubJobWageSlimLink";
import DemandHubMarketingFootLink from "@/components/demand/DemandHubMarketingFootLink";
import DemandJobWageRegionBridge from "@/components/demand/DemandJobWageRegionBridge";
import DemandMetricChart from "@/components/demand/DemandMetricChart";
import DemandRegionPicker from "@/components/demand/DemandRegionPicker";
import DemandScopeCompareCards from "@/components/demand/DemandScopeCompareCards";
import { DemandSearchIndexCell, DemandSearchVolumeCell } from "@/components/demand/DemandSearchMetricCell";
import DemandScopeSummaryStrip from "@/components/demand/DemandScopeSummaryStrip";
import DemandTradeMetricCell from "@/components/demand/DemandTradeMetricCell";
import { DEMAND_HUB_HERO, DEMAND_METRIC_LABELS } from "@/lib/demand/copy";
import DemandHeatBadge from "@/components/demand/DemandHeatBadge";
import DemandDummyBadge from "@/components/demand/DemandDummyBadge";
import {
  type DemandScoreContext,
} from "@/lib/demand/seoul-demand-ranking";
import { DEMAND_SNAPSHOT_META } from "@/lib/demand/dummy-data";
import { demandMetricChartTheme } from "@/lib/demand/metric-chart-theme";
import type { DemandMetricId } from "@/lib/demand/metrics";
import {
  DEMAND_MAX_REGION_COMPARE,
  demandRegionSelectionKey,
  formatDemandRegionLabel,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { trackDemandRegionView } from "@/lib/demand/region-view-tracking";
import {
  buildDemandScopeRowsWithRtms,
  type DemandRtmsDistrictOverrides,
  type DemandScopeTableRow,
} from "@/lib/demand/scope-data";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DailyPulseData } from "@/lib/demand/daily-pulse";
import { mergeDemandKeywordStores, mergeRtmsSeries } from "@/lib/demand/merge-demand-data";
import type { DemandRegionScopeResponse } from "@/lib/demand/region-scope-data";
import {
  applyDemandRegionScopeAccess,
  DEMAND_USAGE_REGION_QUOTA_HINT,
  DEMAND_USAGE_SHARE_TEASER_HINT,
  isDemandRegionKeyUnlocked,
  mergeDemandAccess,
  optimisticallyUnlockDemandRegion,
  removeDemandRegionUnlock,
  type DemandUsageAccess,
} from "@/lib/demand/usage-limits";
import {
  isRadarChartBlinded,
  isRadarMetricBlinded,
  isRadarRowFullyBlinded,
  parseRadarShareParam,
  radarShareTeaserKeyFromParam,
} from "@/lib/demand/radar-share";
import { isDemandRegionScopeLoaded } from "@/lib/demand/region-scope-loaded";
import { demandRegionSeoPathFromSelection } from "@/lib/demand/region-seo-path";
import DemandDataBlindOverlay from "@/components/demand/DemandDataBlindOverlay";
import DemandGuestLoginCta from "@/components/demand/DemandGuestLoginCta";
import DemandUsageBanner from "@/components/demand/DemandUsageBanner";
import DemandHubAdSlot from "@/components/demand/DemandHubAdSlot";
import DemandRadarNationalAd from "@/components/demand/DemandRadarNationalAd";
import DemandRadarRegionalAd from "@/components/demand/DemandRadarRegionalAd";
import { resolveRegionalAdRegionKeys } from "@/lib/demand/radar-ad-region-keys";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import type { HomeAdSlotWithCampaign } from "@/lib/ads-shared";
import type { JobWageHubTeaser } from "@/lib/report/job-wage-hub-teaser";
import { cn } from "@/lib/utils";

function ClickableMetricCell({
  metricId,
  active,
  onClick,
  blind,
  children,
}: {
  metricId: DemandMetricId;
  active: boolean;
  onClick: () => void;
  blind?: boolean;
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
        <DemandDataBlindOverlay blind={!!blind} className="inline-block min-w-[4rem]">
          {children}
        </DemandDataBlindOverlay>
      </button>
    </td>
  );
}

function metricBlinded(
  access: DemandUsageAccess,
  rowKey: string,
  metricId: DemandMetricId,
  shareTeaserKey: string | null
): boolean {
  return isRadarMetricBlinded(access, rowKey, metricId, shareTeaserKey);
}

type Props = {
  rtmsOverrides?: DemandRtmsDistrictOverrides;
  rtmsBaseMonthLabel?: string | null;
  rtmsSeries?: DemandRtmsSeriesStore;
  keywordStore?: DemandKeywordStore | null;
  scoreContext?: DemandScoreContext | null;
  dailyPulse?: DailyPulseData | null;
  initialAccess: DemandUsageAccess;
  hubAds?: {
    radar_pulse_below: HomeAdSlotWithCampaign | null;
    radar_empty_state: HomeAdSlotWithCampaign | null;
    radar_table_below: HomeAdSlotWithCampaign | null;
    radar_regional_fallback: HomeAdSlotWithCampaign | null;
  };
  jobWageTeaser?: JobWageHubTeaser | null;
  marketingReportDate?: string | null;
};

export default function DemandHubWorkspace({
  rtmsOverrides = {},
  rtmsBaseMonthLabel = null,
  rtmsSeries = {},
  keywordStore = null,
  scoreContext = null,
  dailyPulse = null,
  initialAccess,
  hubAds,
  jobWageTeaser = null,
  marketingReportDate = null,
}: Props) {
  const searchParams = useSearchParams();
  const shareParam = searchParams.get("r");
  const shareTeaserKey = useMemo(() => radarShareTeaserKeyFromParam(shareParam), [shareParam]);
  const shareBootstrapped = useRef(false);

  const [access, setAccess] = useState<DemandUsageAccess>(initialAccess);
  const accessRef = useRef(initialAccess);
  const [selections, setSelections] = useState<DemandRegionSelection[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<DemandMetricId | null>("jeonse");
  const [chartRowKey, setChartRowKey] = useState<string | null>(null);
  const [keywordStoreState, setKeywordStoreState] = useState(keywordStore);
  const [rtmsSeriesState, setRtmsSeriesState] = useState(rtmsSeries);
  const keywordStoreRef = useRef(keywordStore);
  const rtmsSeriesRef = useRef(rtmsSeries);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const pendingOptimisticKeys = useRef(new Set<string>());

  accessRef.current = access;
  keywordStoreRef.current = keywordStoreState;
  rtmsSeriesRef.current = rtmsSeriesState;

  useEffect(() => {
    setAccess((prev) => mergeDemandAccess(prev, initialAccess));
  }, [initialAccess]);

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
    async (sel: DemandRegionSelection, fromShare = false) => {
      const key = demandRegionSelectionKey(sel);
      const currentAccess = accessRef.current;
      const dataLoaded = isDemandRegionScopeLoaded(
        sel,
        keywordStoreRef.current,
        rtmsSeriesRef.current
      );
      const shareTeaser =
        currentAccess.tier === "guest" &&
        (fromShare || (shareTeaserKey != null && shareTeaserKey === key));
      const needsUnlock =
        currentAccess.tier === "member" && !isDemandRegionKeyUnlocked(currentAccess, key);

      if (currentAccess.tier === "admin") return;
      if (dataLoaded && currentAccess.tier === "guest") return;
      if (dataLoaded && currentAccess.tier === "member" && !needsUnlock) return;

      if (needsUnlock) {
        const optimistic = optimisticallyUnlockDemandRegion(currentAccess, key);
        if (optimistic) {
          pendingOptimisticKeys.current.add(key);
          accessRef.current = optimistic;
          setAccess(optimistic);
        }
      }

      setLoadingKeys((prev) => {
        if (prev.has(key)) return prev;
        return new Set(prev).add(key);
      });

      try {
        const res = await fetch("/api/demand/region-scope", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selections: [sel],
            shareTeaser,
          }),
        });
        if (!res.ok) {
          if (pendingOptimisticKeys.current.has(key)) {
            pendingOptimisticKeys.current.delete(key);
            setAccess((prev) => removeDemandRegionUnlock(prev, key));
          }
          return;
        }
        const data = (await res.json()) as DemandRegionScopeResponse;
        pendingOptimisticKeys.current.delete(key);
        setAccess((prev) => applyDemandRegionScopeAccess(prev, data));
        if (Object.keys(data.keywordStore.byRegion).length > 0) {
          setKeywordStoreState((prev) =>
            mergeDemandKeywordStores(prev ?? { byRegion: {} }, data.keywordStore)
          );
        }
        if (Object.keys(data.rtmsSeries).length > 0) {
          setRtmsSeriesState((prev) => mergeRtmsSeries(prev, data.rtmsSeries));
        }
      } catch {
        if (pendingOptimisticKeys.current.has(key)) {
          pendingOptimisticKeys.current.delete(key);
          setAccess((prev) => removeDemandRegionUnlock(prev, key));
        }
      } finally {
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [shareTeaserKey]
  );

  useEffect(() => {
    const current = accessRef.current;
    if (current.tier !== "member" || selections.length === 0) return;
    for (const sel of selections) {
      const key = demandRegionSelectionKey(sel);
      if (!isDemandRegionKeyUnlocked(current, key)) {
        void ensureRegionScope(sel);
      }
    }
  }, [access.tier, selections, ensureRegionScope]);

  useEffect(() => {
    if (shareBootstrapped.current || !shareParam) return;
    const sel = parseRadarShareParam(shareParam);
    if (!sel) return;
    shareBootstrapped.current = true;
    const key = demandRegionSelectionKey(sel);
    setSelections([sel]);
    setChartRowKey(key);
    setSelectedMetric("demandScore");
    void ensureRegionScope(sel, true);
  }, [shareParam, ensureRegionScope]);

  const scopeRows = useMemo(
    () =>
      buildDemandScopeRowsWithRtms(
        selections,
        rtmsOverrides,
        keywordStoreState,
        liveScoreContext,
        rtmsSeriesState
      ),
    [selections, rtmsOverrides, keywordStoreState, liveScoreContext, rtmsSeriesState]
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

  useEffect(() => {
    if (!focusRowKey || focusRowKey === "national") return;
    const source = shareTeaserKey != null && shareTeaserKey === focusRowKey ? "share" : "hub";
    void trackDemandRegionView(focusRowKey, source);
  }, [focusRowKey, shareTeaserKey]);

  const regionalAdKeys = useMemo(
    () => resolveRegionalAdRegionKeys({ focusRowKey, scopeRows, selections }),
    [focusRowKey, scopeRows, selections]
  );

  const focusRowBlinded = focusRowKey
    ? isRadarChartBlinded(access, focusRowKey, shareTeaserKey)
    : access.tier === "guest";
  const guestShareTeaser =
    access.tier === "guest" && shareTeaserKey != null && focusRowKey === shareTeaserKey;
  const guestShowLoginCta =
    access.tier === "guest" && hasSelection && scopeRows.length > 0;
  const anyRegionBlinded = scopeRows.some((r) =>
    isRadarRowFullyBlinded(access, demandRegionSelectionKey(r.selection), shareTeaserKey)
  );
  const quotaHint =
    access.tier === "member" && access.remaining === 0 && anyRegionBlinded
      ? DEMAND_USAGE_REGION_QUOTA_HINT
      : null;
  const shareTeaserHint = guestShareTeaser ? DEMAND_USAGE_SHARE_TEASER_HINT : null;

  const focusMetricBlinded = useCallback(
    (metricId: DemandMetricId) =>
      focusRowKey ? metricBlinded(access, focusRowKey, metricId, shareTeaserKey) : true,
    [access, focusRowKey, shareTeaserKey]
  );

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

  const showTableBelowAd = hasSelection && scopeRows.length > 0 && access.tier !== "guest";

  const focusSelection = useMemo(() => {
    const row =
      scopeRows.find((r) => demandRegionSelectionKey(r.selection) === focusRowKey) ?? primaryRow;
    return row?.selection ?? null;
  }, [scopeRows, focusRowKey, primaryRow]);

  const focusRegionLabel = useMemo(
    () => (focusSelection ? formatDemandRegionLabel(focusSelection) : null),
    [focusSelection]
  );

  return (
    <div
      className={cn(
        "space-y-4",
        guestShowLoginCta && "pb-[5.5rem] md:pb-0"
      )}
    >
      <DemandUsageBanner access={access} />

      {dailyPulse ? <DemandHubPulseSection data={dailyPulse} compactOnMobile /> : null}

      {jobWageTeaser && !hasSelection ? <DemandHubJobWageSlimLink teaser={jobWageTeaser} /> : null}

      <DemandRadarNationalAd className="my-4" />

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

      {hasSelection && jobWageTeaser && focusSelection && focusRegionLabel ? (
        <DemandJobWageRegionBridge
          teaser={jobWageTeaser}
          selection={focusSelection}
          regionLabel={focusRegionLabel}
        />
      ) : null}

      {hasSelection ? (
        <>
          {shareTeaserHint ? (
            <p className="text-xs text-slate-600">{shareTeaserHint}</p>
          ) : null}
          {quotaHint ? <p className="text-xs text-amber-800">{quotaHint}</p> : null}

          {primaryRow ? (
          <>
          <div className="hidden md:block">
            <DemandDataBlindOverlay
              blind={focusRowKey ? isRadarRowFullyBlinded(access, focusRowKey, shareTeaserKey) : access.tier === "guest"}
              showCaption={access.tier === "guest"}
              message="로그인 후 확인"
            >
              <DemandScopeSummaryStrip
                rows={scopeRows}
                focusRowKey={focusRowKey}
                selectedMetric={selectedMetric}
                hideSearchSection={guestShareTeaser}
                onSelectMetric={(id) => {
                  const row =
                    scopeRows.find((r) => demandRegionSelectionKey(r.selection) === focusRowKey) ??
                    primaryRow;
                  if (row) selectMetric(row, id);
                }}
              />
            </DemandDataBlindOverlay>
          </div>

          <div className="relative">
            <DemandDataBlindOverlay
              blind={scopeRows.every((r) =>
                isRadarRowFullyBlinded(access, demandRegionSelectionKey(r.selection), shareTeaserKey)
              )}
            >
              <DemandScopeCompareCards
                rows={scopeRows}
                focusRowKey={focusRowKey}
                selectedMetric={selectedMetric}
                onFocusRow={setChartRowKey}
                onSelectMetric={selectMetric}
                rtmsBaseMonthLabel={rtmsBaseMonthLabel}
                isMetricBlinded={focusMetricBlinded}
              />
            </DemandDataBlindOverlay>
            {guestShowLoginCta ? (
              <div className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center p-8 md:flex">
                <DemandGuestLoginCta shareTeaser={guestShareTeaser} variant="card" className="pointer-events-auto max-w-md" />
              </div>
            ) : null}
          </div>
          </>
          ) : null}

          <DemandRadarRegionalAd
            regionKeys={regionalAdKeys}
            fallbackSlot={hubAds?.radar_regional_fallback ?? null}
            className="my-4"
          />

          {primaryRow && selectedMetric && scopeRows.length > 0 ? (
            <DemandDataBlindOverlay blind={focusRowBlinded}>
              <DemandMetricChart
                rows={scopeRows}
                metricId={selectedMetric}
                focusRowKey={focusRowKey}
                rtmsSeries={rtmsSeriesState}
                keywordStore={keywordStoreState}
                scoreContext={liveScoreContext}
              />
            </DemandDataBlindOverlay>
          ) : null}
        </>
      ) : null}

      {!hasSelection ? (
        <div className="space-y-4">
          <DemandHubAdSlot slot={hubAds?.radar_empty_state ?? null} variant="card" />
          <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            지역을 선택하면 비교·그래프가 나타납니다
          </p>
        </div>
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
                  const cellBlind = (metricId: DemandMetricId) =>
                    metricBlinded(access, rowKey, metricId, shareTeaserKey);
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
                        ) : demandRegionSeoPathFromSelection(row.selection) ? (
                          <Link
                            href={demandRegionSeoPathFromSelection(row.selection)!}
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
                        blind={cellBlind("demandScore")}
                      >
                        <div className="text-left">
                          <DemandHeatBadge
                            band={row.demandScore.band}
                            score={row.demandScore.score}
                            heat={row.demandScore.heat}
                            compact
                          />
                        </div>
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="sale"
                        active={isFocusRow && selectedMetric === "sale"}
                        onClick={() => selectMetric(row, "sale")}
                        blind={cellBlind("sale")}
                      >
                        <DemandTradeMetricCell count={row.saleCount} momPercent={row.saleMom} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="jeonse"
                        active={isFocusRow && selectedMetric === "jeonse"}
                        onClick={() => selectMetric(row, "jeonse")}
                        blind={cellBlind("jeonse")}
                      >
                        <DemandTradeMetricCell count={row.jeonseCount} momPercent={row.jeonseMom} />
                      </ClickableMetricCell>

                      <ClickableMetricCell
                        metricId="packingVolume"
                        active={isFocusRow && selectedMetric === "packingVolume"}
                        onClick={() => selectMetric(row, "packingVolume")}
                        blind={cellBlind("packingVolume")}
                      >
                        <DemandSearchVolumeCell metric={row.packing} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="packingIndex"
                        active={isFocusRow && selectedMetric === "packingIndex"}
                        onClick={() => selectMetric(row, "packingIndex")}
                        blind={cellBlind("packingIndex")}
                      >
                        <DemandSearchIndexCell metric={row.packing} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="moveInVolume"
                        active={isFocusRow && selectedMetric === "moveInVolume"}
                        onClick={() => selectMetric(row, "moveInVolume")}
                        blind={cellBlind("moveInVolume")}
                      >
                        <DemandSearchVolumeCell metric={row.moveInClean} />
                      </ClickableMetricCell>
                      <ClickableMetricCell
                        metricId="moveInIndex"
                        active={isFocusRow && selectedMetric === "moveInIndex"}
                        onClick={() => selectMetric(row, "moveInIndex")}
                        blind={cellBlind("moveInIndex")}
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

          {compareHref ? (
            <p className="mt-3 text-center text-xs text-slate-500">
              <Link href={compareHref} className="font-semibold text-slate-600 hover:underline">
                비교 화면
              </Link>
            </p>
          ) : null}
        </div>
      )}

      {showTableBelowAd ? (
        <DemandHubAdSlot slot={hubAds?.radar_table_below ?? null} className="mt-2 hidden md:block" />
      ) : null}

      <DemandHubMarketingFootLink reportDate={marketingReportDate} />

      {guestShowLoginCta ? (
        <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
          <DemandGuestLoginCta shareTeaser={guestShareTeaser} />
        </div>
      ) : null}
    </div>
  );
}
