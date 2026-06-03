"use client";

import { useEffect, useMemo, useState } from "react";
import { formatChartMetricValue } from "@/lib/demand/copy";
import { buildAreaPath, buildLinePath } from "@/lib/demand/chart-spline";
import { linearMap, niceChartScale } from "@/lib/demand/chart-scale";
import {
  DEMAND_CHART_ACTIVE_RING,
  demandMetricChartTheme,
  demandRegionCompareColor,
} from "@/lib/demand/metric-chart-theme";
import {
  DEMAND_COMPOSITE_ABOUT,
  DEMAND_COMPOSITE_METHOD_NOTE,
  DEMAND_PACKING_INTEREST_ABOUT,
} from "@/lib/demand/copy";
import { DemandRevealInline } from "@/components/demand/DemandReveal";
import { demandMetricLabel, isDemandTradeMetric, type DemandMetricId } from "@/lib/demand/metrics";
import {
  buildDemandMetricChartSeries,
  type DemandAnyChartRange,
  type DemandChartPoint,
  type DemandScopeTableRow,
} from "@/lib/demand/scope-data";
import { demandKeywordKeyForMetric } from "@/lib/demand/keyword-hub-data";
import { demandRegionSelectionKey } from "@/lib/demand/regions";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import { cn } from "@/lib/utils";

const W = 640;
const H = 216;
const PAD = { top: 14, right: 16, bottom: 28, left: 48 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

type ChartKind = "trade" | "index" | "indexDelta" | "volume" | "composite" | "packingInterest";

type SeriesBundle = {
  row: DemandScopeTableRow;
  rowKey: string;
  label: string;
  color: string;
  points: DemandChartPoint[];
  linePath: string;
  coords: Array<DemandChartPoint & { x: number; y: number }>;
};

function defaultRangeForMetric(metricId: DemandMetricId): DemandAnyChartRange {
  if (isDemandTradeMetric(metricId)) return "12m";
  if (metricId === "composite" || metricId === "packingInterest") return "1y";
  return "30d";
}

function isSearchIndexMetric(
  metricId: DemandMetricId
): metricId is "packingIndex" | "moveInIndex" {
  return metricId === "packingIndex" || metricId === "moveInIndex";
}

function chartRangeOptions(
  metricId: DemandMetricId
): { key: DemandAnyChartRange; label: string; disabled?: boolean }[] {
  if (isDemandTradeMetric(metricId)) {
    return [
      { key: "12m", label: "12개월" },
      { key: "24m", label: "24개월" },
      { key: "36m", label: "36개월", disabled: true },
    ];
  }
  if (isSearchIndexMetric(metricId)) {
    return [
      { key: "30d", label: "30일" },
      { key: "1y", label: "1년" },
      { key: "3y", label: "3년", disabled: true },
    ];
  }
  if (metricId === "packingVolume" || metricId === "moveInVolume") {
    return [
      { key: "30d", label: "30일" },
      { key: "1y", label: "1년" },
      { key: "3y", label: "3년", disabled: true },
    ];
  }
  if (metricId === "composite" || metricId === "packingInterest") {
    return [
      { key: "1y", label: "1년" },
      { key: "3y", label: "3년", disabled: true },
    ];
  }
  return [
    { key: "30d", label: "30일" },
    { key: "1y", label: "1년", disabled: true },
    { key: "3y", label: "3년", disabled: true },
  ];
}

type Props = {
  rows: DemandScopeTableRow[];
  metricId: DemandMetricId;
  focusRowKey?: string | null;
  rtmsSeries?: DemandRtmsSeriesStore;
};

function pctX(svgX: number): string {
  return `${(svgX / W) * 100}%`;
}

function pctY(svgY: number): string {
  return `${(svgY / H) * 100}%`;
}

const PLOT_TOP_PCT = (PAD.top / H) * 100;
const PLOT_HEIGHT_PCT = (PLOT_H / H) * 100;

/** 날짜 열 터치·클릭 폭(%) — 포인트 수에 따라 */
function hitColumnWidthPct(pointCount: number): number {
  if (pointCount <= 1) return 20;
  return Math.min(14, Math.max(6, 72 / pointCount));
}

/** X축에 표시할 인덱스(시작·끝 포함, 균등 간격) */
function pickXAxisLabelIndices(pointCount: number, maxLabels: number): number[] {
  if (pointCount <= 0) return [];
  if (pointCount <= maxLabels) {
    return Array.from({ length: pointCount }, (_, i) => i);
  }
  const cap = Math.max(2, maxLabels);
  const indices = new Set<number>([0, pointCount - 1]);
  for (let k = 1; k < cap - 1; k += 1) {
    indices.add(Math.round((k * (pointCount - 1)) / (cap - 1)));
  }
  return [...indices].sort((a, b) => a - b);
}

function isMonthlyPeriodLabel(period: string): boolean {
  const parts = period.split(".");
  return parts.length === 2;
}

function buildCoords(
  points: DemandChartPoint[],
  min: number,
  max: number
): Array<DemandChartPoint & { x: number; y: number }> {
  const n = points.length;
  return points.map((p, i) => ({
    ...p,
    x: PAD.left + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W),
    y: PAD.top + linearMap(p.value, min, max, PLOT_H, 0),
  }));
}

export default function DemandMetricChart({
  rows,
  metricId,
  focusRowKey,
  rtmsSeries,
}: Props) {
  const [range, setRange] = useState<DemandAnyChartRange>(() => defaultRangeForMetric(metricId));
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setRange(defaultRangeForMetric(metricId));
  }, [metricId]);

  const compareMode = rows.length > 1;
  const rowKeysSig = rows.map((r) => demandRegionSelectionKey(r.selection)).join(",");
  const chartUid = `${metricId}-${range}-${rowKeysSig}`;
  const metricTheme = demandMetricChartTheme(metricId);

  const focusKey =
    focusRowKey && rows.some((r) => demandRegionSelectionKey(r.selection) === focusRowKey)
      ? focusRowKey
      : rows[0]
        ? demandRegionSelectionKey(rows[0].selection)
        : null;

  const { chartKind, subtitle, seriesList } = useMemo(() => {
    const bundles = rows.map((row, i) => {
      const series = buildDemandMetricChartSeries(row, metricId, range, { rtmsSeries });
      return {
        row,
        rowKey: demandRegionSelectionKey(row.selection),
        label: row.label,
        color: compareMode ? demandRegionCompareColor(i) : metricTheme.stroke,
        points: series.points,
        chartKind: series.chartKind,
        subtitle: series.subtitle,
      };
    });
    const kind = bundles[0]?.chartKind ?? "trade";
    const sub = compareMode
      ? bundles.map((b) => b.subtitle).find(Boolean) ?? ""
      : bundles[0]?.subtitle ?? "";
    return { chartKind: kind, subtitle: sub, seriesList: bundles };
  }, [rows, metricId, range, compareMode, metricTheme.stroke, rtmsSeries]);

  const indexNationalFallbackNote = useMemo(() => {
    if (!isSearchIndexMetric(metricId) || rows.length === 0) return null;
    const key = demandKeywordKeyForMetric(metricId);
    const kwLabel = key === "packing" ? "포장이사" : "입주청소";
    const districtRows = rows.filter((r) => r.selection.scope === "district");
    if (districtRows.length === 0) return null;
    const levels = districtRows.map(
      (r) => r.keywordIndexLevelByKey?.[key] ?? r.keywordIndexLevel ?? "dummy"
    );
    if (!levels.every((l) => l === "national")) return null;
    if (compareMode && districtRows.length >= 2) {
      return `구별 ${kwLabel} 검색지수 미수집 — 선택한 ${districtRows.length}개 구 모두 전국 「${kwLabel}」 동일 추이입니다. Vercel에 NAVER_CLIENT_ID/SECRET 설정 후 관리자 「데이터랩 수집」을 실행하세요.`;
    }
    if (!compareMode && districtRows.length === 1) {
      return `${districtRows[0].label} 구별 검색지수 미수집 — 전국 「${kwLabel}」 추이를 표시합니다. 구별 비교·차트는 데이터랩(구별 키워드) 수집 후 가능합니다.`;
    }
    return null;
  }, [compareMode, metricId, rows]);

  const displaySeriesList = useMemo(() => {
    if (
      !indexNationalFallbackNote ||
      !compareMode ||
      seriesList.length < 2 ||
      !isSearchIndexMetric(metricId)
    ) {
      return seriesList;
    }
    const sig = (pts: DemandChartPoint[]) => pts.map((p) => `${p.period}:${p.value}`).join("|");
    const ref = sig(seriesList[0].points);
    if (!seriesList.every((s) => sig(s.points) === ref)) return seriesList;
    const key = demandKeywordKeyForMetric(metricId);
    const kwLabel = key === "packing" ? "포장이사" : "입주청소";
    return [
      {
        ...seriesList[0],
        label: `전국 · ${kwLabel}`,
        color: demandRegionCompareColor(0),
      },
    ];
  }, [indexNationalFallbackNote, compareMode, seriesList, metricId]);

  const chart = useMemo(() => {
    if (displaySeriesList.length === 0 || displaySeriesList[0].points.length === 0) return null;

    const pointCount = Math.min(...displaySeriesList.map((s) => s.points.length));
    const trimmed = displaySeriesList.map((s) => ({
      ...s,
      points: s.points.slice(-pointCount),
    }));

    const allValues = trimmed.flatMap((s) => s.points.map((p) => p.value));
    const symmetric = chartKind === "indexDelta";
    const { min, max, ticks } = niceChartScale(allValues, {
      floorAtZero: chartKind === "trade" || chartKind === "volume",
      symmetric,
    });

    const baselineY = PAD.top + PLOT_H;
    const zeroY =
      symmetric && min < 0 && max > 0 ? PAD.top + linearMap(0, min, max, PLOT_H, 0) : null;

    const series: SeriesBundle[] = trimmed.map((s) => {
      const coords = buildCoords(s.points, min, max);
      return {
        row: s.row,
        rowKey: s.rowKey,
        label: s.label,
        color: s.color,
        points: s.points,
        coords,
        linePath: buildLinePath(coords),
      };
    });

    const primary = series.find((s) => s.rowKey === focusKey) ?? series[0];
    const areaPath =
      !compareMode && primary
        ? buildAreaPath(primary.linePath, primary.coords, baselineY)
        : null;

    return { min, max, ticks, series, zeroY, fmt: chartKind as ChartKind, pointCount, areaPath };
  }, [displaySeriesList, chartKind, focusKey, compareMode]);

  const pointsSignature = useMemo(
    () =>
      chart?.series.map((s) => s.points.map((p) => `${p.period}:${p.value}`).join("|")).join(";") ?? "",
    [chart]
  );

  useEffect(() => {
    if (!chart) return;
    setSelectedIndex(Math.max(0, chart.pointCount - 1));
  }, [chartUid, pointsSignature, chart?.pointCount]);

  const label = demandMetricLabel(metricId);
  const primaryRow = rows.find((r) => demandRegionSelectionKey(r.selection) === focusKey) ?? rows[0];
  const headerScopeHint = compareMode
    ? `${rows.length}개 지역 비교`
    : (primaryRow?.pathLabel ?? "");
  const keyword =
    metricId === "packingInterest" ||
      metricId === "packingVolume" ||
      metricId === "packingIndex"
      ? primaryRow?.packing.keyword
      : metricId === "moveInVolume" || metricId === "moveInIndex"
        ? primaryRow?.moveInClean.keyword
        : null;
  const footerNote = indexNationalFallbackNote ?? subtitle;
  const showFooterSubtitle =
    footerNote &&
    (indexNationalFallbackNote != null ||
      (!compareMode &&
        (isDemandTradeMetric(metricId) ||
          metricId === "packingVolume" ||
          metricId === "moveInVolume" ||
          metricId === "packingIndex" ||
          metricId === "moveInIndex")));

  if (!chart || chart.pointCount === 0) {
    const emptySub = subtitle || seriesList[0]?.subtitle;
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {headerScopeHint}
            {!compareMode && keyword ? ` · ${keyword}` : null}
          </p>
        </div>
        <div className="px-4 py-10 text-center sm:px-5">
          <p className="text-sm text-slate-600">표시할 추이 데이터가 없습니다.</p>
          {emptySub ? (
            <p className="mx-auto mt-2 max-w-lg text-[11px] leading-relaxed text-slate-500">{emptySub}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const { ticks, series, zeroY, fmt, areaPath } = chart;
  const activeIdx = Math.min(Math.max(0, selectedIndex), chart.pointCount - 1);
  const activeX = series[0]?.coords[activeIdx]?.x ?? PAD.left;
  const densePoints = chart.pointCount > 15;
  const dotRadius = densePoints ? 2 : 3;
  const gradientId = `demand-grad-${chartUid}`;
  const xAxisLabelIndices = pickXAxisLabelIndices(chart.pointCount, densePoints ? 5 : 7);
  const xAxisIsMonthly =
    series[0]?.points.length > 0 && isMonthlyPeriodLabel(series[0].points[0].period);
  const xAxisBaselineY = PAD.top + PLOT_H;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {headerScopeHint}
              {!compareMode && keyword ? ` · ${keyword}` : null}
            </p>
          </div>
          <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-0.5 text-xs">
            {chartRangeOptions(metricId).map(({ key, label: rangeLabel, disabled }) => (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!disabled) setRange(key);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  disabled && "cursor-not-allowed opacity-40",
                  !disabled && range === key && "bg-slate-100 font-medium text-slate-900",
                  !disabled && range !== key && "text-slate-500 hover:text-slate-700",
                  disabled && "text-slate-400"
                )}
                aria-disabled={disabled}
              >
                {rangeLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {indexNationalFallbackNote ? (
        <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs leading-relaxed text-amber-900 sm:px-5">
          {indexNationalFallbackNote}
        </p>
      ) : null}

      <div
        className="mx-3 mt-2 border-y border-slate-200 bg-gradient-to-b from-slate-50 to-white px-3 py-2.5 sm:mx-4"
        aria-live="polite"
      >
        <p className="text-[10px] text-slate-400">
          그래프에서 날짜 열을 탭하면 수치가 갱신됩니다.
        </p>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
          <div className="flex shrink-0 items-baseline gap-2">
            <span className="text-[10px] font-medium text-slate-500">선택</span>
            <span className="text-base font-bold tabular-nums text-teal-800">
              {series[0].coords[activeIdx].period}
            </span>
            <span className="text-[10px] tabular-nums text-slate-400">
              ({activeIdx + 1}/{chart.pointCount}
              {xAxisIsMonthly ? "월" : "일"})
            </span>
          </div>
          {compareMode ? (
            <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {series.map((s) => {
                const pt = s.coords[activeIdx];
                const focused = s.rowKey === focusKey;
                return (
                  <li
                    key={s.rowKey}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 tabular-nums",
                      focused
                        ? "border-slate-300 bg-white font-semibold text-slate-900 shadow-sm"
                        : "border-slate-200/80 bg-white/70 text-slate-700"
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                      aria-hidden
                    />
                    <span className="text-xs">{s.label}</span>
                    <span className="text-sm font-semibold">
                      {formatChartMetricValue(pt.value, fmt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xl font-bold tabular-nums text-slate-900 sm:ml-auto">
              {formatChartMetricValue(series[0].coords[activeIdx].value, fmt)}
            </p>
          )}
        </div>
      </div>

      <div className="relative mx-3 mb-1 mt-0 aspect-[640/216] w-[calc(100%-1.5rem)] max-w-full sm:mx-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          {!compareMode ? (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metricTheme.fillFrom} stopOpacity={0.28} />
                <stop offset="85%" stopColor={metricTheme.fillFrom} stopOpacity={0.04} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
          ) : null}

          {ticks.map((tick) => {
            const y = PAD.top + linearMap(tick, chart.min, chart.max, PLOT_H, 0);
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={W - PAD.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fill="#94a3b8" fontSize={9}>
                  {formatChartMetricValue(tick, fmt)}
                </text>
              </g>
            );
          })}

          {zeroY != null ? (
            <line
              x1={PAD.left}
              y1={zeroY}
              x2={W - PAD.right}
              y2={zeroY}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
            />
          ) : null}

          <line
            x1={PAD.left}
            y1={xAxisBaselineY}
            x2={W - PAD.right}
            y2={xAxisBaselineY}
            stroke="#cbd5e1"
          />

          {xAxisLabelIndices.map((i) => {
            const c = series[0]?.coords[i];
            if (!c) return null;
            const isActive = i === activeIdx;
            return (
              <g key={`x-guide-${i}`}>
                <line
                  x1={c.x}
                  y1={PAD.top}
                  x2={c.x}
                  y2={xAxisBaselineY}
                  stroke={isActive ? "#99f6e4" : "#e2e8f0"}
                  strokeDasharray={isActive ? undefined : "3 4"}
                  strokeOpacity={isActive ? 0.9 : 0.65}
                />
                <line
                  x1={c.x}
                  y1={xAxisBaselineY}
                  x2={c.x}
                  y2={xAxisBaselineY + 4}
                  stroke={isActive ? "#0d9488" : "#94a3b8"}
                />
              </g>
            );
          })}

          {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}

          <line
            x1={activeX}
            y1={PAD.top}
            x2={activeX}
            y2={PAD.top + PLOT_H}
            stroke={compareMode ? "#94a3b8" : metricTheme.stroke}
            strokeOpacity={0.25}
            strokeDasharray="3 3"
          />

          {series.map((s) => {
            const focused = s.rowKey === focusKey;
            return (
              <path
                key={`line-${s.rowKey}`}
                d={s.linePath}
                fill="none"
                stroke={s.color}
                strokeWidth={focused ? 2.5 : compareMode ? 2 : 2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeOpacity={compareMode && !focused ? 0.85 : 1}
              />
            );
          })}

          {series.map((s) => {
            const focused = s.rowKey === focusKey;
            const c = s.coords[activeIdx];
            if (!c) return null;

            if (compareMode) {
              if (!focused) {
                return (
                  <circle
                    key={`dot-${s.rowKey}`}
                    cx={c.x}
                    cy={c.y}
                    r={dotRadius}
                    fill={s.color}
                    stroke="white"
                    strokeWidth={1}
                  />
                );
              }
              return (
                <g key={`dot-${s.rowKey}`}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={8}
                    fill="none"
                    stroke={DEMAND_CHART_ACTIVE_RING}
                    strokeWidth={2}
                  />
                  <circle cx={c.x} cy={c.y} r={4.5} fill={s.color} stroke="white" strokeWidth={2} />
                </g>
              );
            }

            return s.coords.map((pt, i) => {
              const isActive = i === activeIdx;
              if (isActive) {
                return (
                  <g key={`dot-${s.rowKey}-${i}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={8}
                      fill="none"
                      stroke={DEMAND_CHART_ACTIVE_RING}
                      strokeWidth={2}
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={4.5}
                      fill={s.color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  </g>
                );
              }
              return (
                <circle
                  key={`dot-${s.rowKey}-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={dotRadius}
                  fill={s.color}
                  stroke="white"
                  strokeWidth={densePoints ? 1 : 1.5}
                />
              );
            });
          })}

          {xAxisLabelIndices.map((i) => {
            const c = series[0]?.coords[i];
            const pt = series[0]?.points[i];
            if (!c || !pt) return null;
            const isActive = i === activeIdx;
            return (
              <text
                key={`x-label-${i}`}
                x={c.x}
                y={H - 8}
                textAnchor="middle"
                fill={isActive ? "#0f766e" : "#64748b"}
                fontSize={9}
                fontWeight={isActive ? 600 : 400}
              >
                {pt.period}
              </text>
            );
          })}

          <text x={PAD.left} y={H - 1} textAnchor="start" fill="#94a3b8" fontSize={8}>
            {xAxisIsMonthly ? "월" : "일"}
          </text>
        </svg>

        {series[0]?.coords.map((c, i) => {
          const isActive = i === activeIdx;
          const colW = hitColumnWidthPct(chart.pointCount);
          return (
            <button
              key={`hit-${i}`}
              type="button"
              className={cn(
                "absolute z-10 -translate-x-1/2 touch-manipulation rounded-md border-0 bg-transparent p-0",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1",
                isActive ? "bg-teal-500/10 ring-1 ring-teal-400/40" : "hover:bg-slate-500/8"
              )}
              style={{
                left: pctX(c.x),
                top: `${PLOT_TOP_PCT}%`,
                width: `${colW}%`,
                height: `${PLOT_HEIGHT_PCT}%`,
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(i);
              }}
              aria-label={`${c.period} 데이터 보기`}
              aria-pressed={isActive}
            >
              <span className="sr-only">{c.period}</span>
            </button>
          );
        })}
      </div>

      {showFooterSubtitle ? (
        <p
          className={cn(
            "border-t border-slate-100 px-4 py-2 text-[11px] sm:px-5",
            indexNationalFallbackNote ? "text-amber-800" : "text-slate-400"
          )}
        >
          {footerNote}
        </p>
      ) : null}

      {metricId === "composite" ? (
        <div className="border-t border-slate-100 px-4 py-2 sm:px-5">
          <DemandRevealInline closedLabel="입주 온도 안내">
            <p className="text-[11px] leading-relaxed text-slate-600">{DEMAND_COMPOSITE_ABOUT}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{DEMAND_COMPOSITE_METHOD_NOTE}</p>
          </DemandRevealInline>
        </div>
      ) : null}

      {metricId === "packingInterest" ? (
        <div className="border-t border-slate-100 px-4 py-2 sm:px-5">
          <DemandRevealInline closedLabel="관심지수 안내">
            <p className="text-[11px] leading-relaxed text-slate-600">{DEMAND_PACKING_INTEREST_ABOUT}</p>
          </DemandRevealInline>
        </div>
      ) : null}
    </div>
  );
}
