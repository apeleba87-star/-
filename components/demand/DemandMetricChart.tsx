"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { formatChartMetricValue, formatSearchVolumeMonth } from "@/lib/demand/copy";
import { buildAreaPath, buildSmoothLinePath } from "@/lib/demand/chart-spline";
import { buildLinearTicks, linearMap, niceLinearDomain } from "@/lib/demand/chart-scale";
import { buildDemandMetricChartSeries, type DemandScopeTableRow } from "@/lib/demand/scope-data";
import { demandMetricLabel, type DemandMetricId } from "@/lib/demand/metrics";
import { cn } from "@/lib/utils";

const W = 640;
const H = 220;
const PAD = { top: 28, right: 24, bottom: 36, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

type RangeKey = "30d" | "1y" | "3y";
type Granularity = "month" | "week";

type ChartTheme = {
  stroke: string;
  fillId: string;
  fillFrom: string;
  fillTo: string;
  dot: string;
  tag: string;
};

const THEMES: Record<string, ChartTheme> = {
  volume: {
    stroke: "#10b981",
    fillId: "demand-fill-emerald",
    fillFrom: "#10b981",
    fillTo: "#ffffff",
    dot: "#059669",
    tag: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  indexDelta: {
    stroke: "#8b5cf6",
    fillId: "demand-fill-violet",
    fillFrom: "#8b5cf6",
    fillTo: "#ffffff",
    dot: "#7c3aed",
    tag: "bg-violet-50 text-violet-800 ring-violet-200",
  },
  trade: {
    stroke: "#0d9488",
    fillId: "demand-fill-teal",
    fillFrom: "#14b8a6",
    fillTo: "#ffffff",
    dot: "#0f766e",
    tag: "bg-teal-50 text-teal-800 ring-teal-200",
  },
  composite: {
    stroke: "#115e59",
    fillId: "demand-fill-teal-dark",
    fillFrom: "#0f766e",
    fillTo: "#ffffff",
    dot: "#134e4a",
    tag: "bg-teal-50 text-teal-900 ring-teal-300",
  },
};

type Props = {
  row: DemandScopeTableRow;
  metricId: DemandMetricId;
};

function summaryLabel(metricId: DemandMetricId, chartKind: string): string {
  if (metricId === "packingVolume" || metricId === "moveInVolume") return "월 검색량";
  if (metricId === "packingIndex" || metricId === "moveInIndex") return "최근 전일 지수";
  if (metricId === "composite") return "입주수요지수";
  if (chartKind === "trade") return "최근 월 건수";
  return "값";
}

function slicePoints<T extends { period: string }>(points: T[], range: RangeKey): T[] {
  const n = range === "30d" ? 6 : range === "1y" ? 10 : points.length;
  return points.slice(-n);
}

export default function DemandMetricChart({ row, metricId }: Props) {
  const [range, setRange] = useState<RangeKey>("1y");
  const [granularity, setGranularity] = useState<Granularity>("month");

  const series = buildDemandMetricChartSeries(row, metricId);
  const { chartKind, subtitle } = series;
  const label = demandMetricLabel(metricId);
  const theme = THEMES[chartKind] ?? THEMES.trade;

  const keyword =
    metricId === "packingVolume" || metricId === "packingIndex"
      ? row.packing.keyword
      : metricId === "moveInVolume" || metricId === "moveInIndex"
        ? row.moveInClean.keyword
        : row.pathLabel;

  const points = useMemo(() => slicePoints(series.points, range), [series.points, range]);

  const chart = useMemo(() => {
    const values = points.map((p) => p.value);
    if (values.length === 0) return null;

    const symmetric = chartKind === "indexDelta";
    const domain = symmetric
      ? { min: Math.min(-3, ...values), max: Math.max(3, ...values) }
      : niceLinearDomain(values, { floorAtZero: chartKind === "trade" || chartKind === "volume" });

    const yTicks = buildLinearTicks(domain.min, domain.max, 5);
    const baselineY = PAD.top + PLOT_H;

    const coords = points.map((p, i) => ({
      ...p,
      x: PAD.left + (points.length <= 1 ? PLOT_W / 2 : (i / (points.length - 1)) * PLOT_W),
      y: PAD.top + linearMap(p.value, domain.min, domain.max, PLOT_H, 0),
    }));

    const linePath = buildSmoothLinePath(coords);
    const areaPath = buildAreaPath(linePath, coords, baselineY);

    let maxIdx = 0;
    let minIdx = 0;
    for (let i = 1; i < values.length; i += 1) {
      if (values[i] > values[maxIdx]) maxIdx = i;
      if (values[i] < values[minIdx]) minIdx = i;
    }

    const zeroY =
      chartKind === "indexDelta" && domain.min < 0 && domain.max > 0
        ? PAD.top + linearMap(0, domain.min, domain.max, PLOT_H, 0)
        : null;

    const latest = values[values.length - 1];

    return { domain, yTicks, coords, linePath, areaPath, maxIdx, minIdx, zeroY, latest, fmt: chartKind };
  }, [points, chartKind]);

  const summaryValue = useMemo(() => {
    if (!chart) return "—";
    if (metricId === "packingVolume") {
      const v = row.packing.searchVolumeMonth;
      return v != null ? formatSearchVolumeMonth(v) : row.packing.searchVolumeBelowTen ? "<10" : "—";
    }
    if (metricId === "moveInVolume") {
      const v = row.moveInClean.searchVolumeMonth;
      return v != null ? formatSearchVolumeMonth(v) : row.moveInClean.searchVolumeBelowTen ? "<10" : "—";
    }
    return formatChartMetricValue(chart.latest, chart.fmt);
  }, [chart, metricId, row]);

  if (!chart) return null;

  const { yTicks, coords, linePath, areaPath, maxIdx, minIdx, zeroY, fmt } = chart;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/40">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{label}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{row.pathLabel} · {subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              {(
                [
                  { key: "30d" as const, label: "30일" },
                  { key: "1y" as const, label: "1년" },
                  { key: "3y" as const, label: "3년" },
                ] as const
              ).map(({ key, label: rangeLabel }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition-colors",
                    range === key
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {rangeLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                theme.tag
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.dot }} aria-hidden />
              {keyword}
            </span>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-xs text-slate-400"
            >
              <Plus className="h-3 w-3" />
              비교 키워드 추가
            </button>
          </div>
          <label className="inline-flex items-center gap-1 text-xs text-slate-600">
            <span className="sr-only">집계 단위</span>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-200"
            >
              <option value="month">월별</option>
              <option value="week">주별</option>
            </select>
            <ChevronDown className="-ml-5 h-3.5 w-3.5 pointer-events-none text-slate-400" aria-hidden />
          </label>
        </div>
      </div>

      <div className="px-2 pb-2 pt-1 sm:px-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full text-slate-400"
          role="img"
          aria-label={`${row.pathLabel} ${label} 추세`}
        >
          <defs>
            <linearGradient id={theme.fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.fillFrom} stopOpacity={0.22} />
              <stop offset="100%" stopColor={theme.fillTo} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => {
            const y = PAD.top + linearMap(tick, chart.domain.min, chart.domain.max, PLOT_H, 0);
            return (
              <g key={tick}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                <text
                  x={PAD.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] tabular-nums"
                >
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
              strokeWidth={1}
              strokeDasharray="5 4"
            />
          ) : null}

          <path d={areaPath} fill={`url(#${theme.fillId})`} />
          <path d={linePath} fill="none" stroke={theme.stroke} strokeWidth={2.5} strokeLinecap="round" />

          {coords.map((c, i) => {
            const showX = i === 0 || i === coords.length - 1 || i % 2 === 0;
            return showX ? (
              <text
                key={c.period}
                x={c.x}
                y={H - 10}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] tabular-nums"
              >
                {c.period}
              </text>
            ) : null;
          })}

          {[maxIdx, minIdx]
            .filter((idx, pos, arr) => arr.indexOf(idx) === pos)
            .map((idx) => {
              const c = coords[idx];
              const isMax = idx === maxIdx;
              const tag = isMax ? "최대" : "최소";
              const labelY = isMax ? c.y - 14 : c.y + 20;
              return (
                <g key={`${tag}-${idx}`}>
                  <circle cx={c.x} cy={c.y} r={5} fill="white" stroke={theme.stroke} strokeWidth={2} />
                  <circle cx={c.x} cy={c.y} r={2.5} fill={theme.dot} />
                  <text
                    x={c.x}
                    y={labelY}
                    textAnchor="middle"
                    className="fill-slate-600 text-[10px] font-semibold tabular-nums"
                  >
                    {tag} {c.period}
                  </text>
                  <text
                    x={c.x}
                    y={labelY + (isMax ? -11 : 11)}
                    textAnchor="middle"
                    className="fill-slate-500 text-[9px] tabular-nums"
                  >
                    {formatChartMetricValue(c.value, fmt)}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="w-24 pb-2 text-left font-medium" />
              <th className="pb-2 text-left font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.dot }} />
                  {keyword}
                </span>
              </th>
              <th className="pb-2 text-right font-medium text-slate-400">더미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1.5 font-medium text-slate-600">{summaryLabel(metricId, chartKind)}</td>
              <td className="py-1.5 font-bold tabular-nums text-slate-900">{summaryValue}</td>
              <td className="py-1.5 text-right text-slate-400">{granularity === "month" ? "월별" : "주별"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {(metricId === "packingVolume" || metricId === "moveInVolume") && (
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 sm:px-5">
          검색광고 API는 일별 원본이 없어, 검색량은 최근 30일 스냅샷·월별 추정치로 표시합니다.
        </p>
      )}
    </div>
  );
}
