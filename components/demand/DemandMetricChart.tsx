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
import { demandMetricLabel, isDemandTradeMetric, type DemandMetricId } from "@/lib/demand/metrics";
import {
  buildDemandMetricChartSeries,
  type DemandAnyChartRange,
  type DemandChartPoint,
  type DemandScopeTableRow,
} from "@/lib/demand/scope-data";
import { demandRegionSelectionKey } from "@/lib/demand/regions";
import type { DemandKeywordHubData } from "@/lib/demand/keyword-hub-data";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import { cn } from "@/lib/utils";

const W = 640;
const H = 200;
const PAD = { top: 14, right: 16, bottom: 14, left: 48 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

type ChartKind = "trade" | "index" | "indexDelta" | "volume" | "composite";

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
  return isDemandTradeMetric(metricId) ? "12m" : "30d";
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
  return [
    { key: "30d", label: "30일" },
    { key: "1y", label: "1년" },
    { key: "3y", label: "3년", disabled: true },
  ];
}

type Props = {
  rows: DemandScopeTableRow[];
  metricId: DemandMetricId;
  focusRowKey?: string | null;
  rtmsSeries?: DemandRtmsSeriesStore;
  keywordHub?: DemandKeywordHubData | null;
};

function pctX(svgX: number): string {
  return `${(svgX / W) * 100}%`;
}

function pctY(svgY: number): string {
  return `${(svgY / H) * 100}%`;
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
  keywordHub,
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
      const series = buildDemandMetricChartSeries(row, metricId, range, { rtmsSeries, keywordHub });
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
  }, [rows, metricId, range, compareMode, metricTheme.stroke, rtmsSeries, keywordHub]);

  const chart = useMemo(() => {
    if (seriesList.length === 0 || seriesList[0].points.length === 0) return null;

    const pointCount = Math.min(...seriesList.map((s) => s.points.length));
    const trimmed = seriesList.map((s) => ({
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
  }, [seriesList, chartKind, focusKey, compareMode]);

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
  const compareSubtitle = compareMode ? rows.map((r) => r.label).join(" · ") : null;
  const showFooterSubtitle =
    !compareMode &&
    subtitle &&
    (isDemandTradeMetric(metricId) ||
      metricId === "packingVolume" ||
      metricId === "moveInVolume");

  if (!chart || chart.pointCount === 0) return null;

  const { ticks, series, zeroY, fmt, areaPath } = chart;
  const activeIdx = Math.min(Math.max(0, selectedIndex), chart.pointCount - 1);
  const activeX = series[0]?.coords[activeIdx]?.x ?? PAD.left;
  const densePoints = chart.pointCount > 15;
  const dotRadius = densePoints ? 2 : 3;
  const gradientId = `demand-grad-${chartUid}`;

  const primaryRow = rows.find((r) => demandRegionSelectionKey(r.selection) === focusKey) ?? rows[0];
  const keyword =
    metricId === "packingVolume" || metricId === "packingIndex"
      ? primaryRow.packing.keyword
      : metricId === "moveInVolume" || metricId === "moveInIndex"
        ? primaryRow.moveInClean.keyword
        : null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {compareSubtitle ?? primaryRow.pathLabel}
              {!compareMode && keyword ? ` · ${keyword}` : null}
            </p>
            {compareMode ? (
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {series.map((s) => {
                  const focused = s.rowKey === focusKey;
                  return (
                    <li
                      key={s.rowKey}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs",
                        focused ? "font-semibold text-slate-800" : "text-slate-600"
                      )}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden
                      />
                      {s.label}
                    </li>
                  );
                })}
              </ul>
            ) : null}
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

      <div className="relative mx-3 mb-3 mt-2 aspect-[640/200] w-[calc(100%-1.5rem)] max-w-full sm:mx-4">
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
        </svg>

        {series[0]?.coords.map((c, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={`hit-${i}`}
              type="button"
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full touch-manipulation",
                densePoints ? "h-6 w-6" : "h-9 w-9",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                !isActive && "hover:bg-slate-500/5"
              )}
              style={{ left: pctX(c.x), top: pctY(c.y) }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(i);
              }}
              aria-label={`${c.period}`}
              aria-pressed={isActive}
            >
              <span className="sr-only">{c.period}</span>
            </button>
          );
        })}

        <div
          className={cn(
            "pointer-events-none absolute z-20 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 shadow-md",
            compareMode ? "min-w-[7.5rem]" : "min-w-[4.75rem] text-center"
          )}
          style={{
            left: pctX(activeX),
            top: pctY(series[0].coords[activeIdx].y),
            transform: "translate(-50%, 12px)",
          }}
        >
          <p className="text-[10px] text-slate-500">{series[0].coords[activeIdx].period}</p>
          {compareMode ? (
            <ul className="mt-1 space-y-0.5">
              {series.map((s) => {
                const pt = s.coords[activeIdx];
                return (
                  <li
                    key={s.rowKey}
                    className={cn(
                      "flex items-center justify-between gap-3 text-xs tabular-nums",
                      s.rowKey === focusKey ? "font-semibold text-slate-900" : "text-slate-700"
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden
                      />
                      {s.label}
                    </span>
                    <span>{formatChartMetricValue(pt.value, fmt)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs font-semibold tabular-nums text-slate-900">
              {formatChartMetricValue(series[0].coords[activeIdx].value, fmt)}
            </p>
          )}
        </div>
      </div>

      {showFooterSubtitle ? (
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 sm:px-5">{subtitle}</p>
      ) : null}
    </div>
  );
}
