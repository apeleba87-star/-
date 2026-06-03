import type { DemandMetricId } from "@/lib/demand/metrics";

/** 선택 점 바깥 링 — 지표 색과 무관하게 통일 */
export const DEMAND_CHART_ACTIVE_RING = "#14b8a6";

export type DemandMetricChartTheme = {
  stroke: string;
  fillFrom: string;
  cardSelected: string;
  cellActive: string;
  cellHover: string;
  rowBg: string;
};

export const DEMAND_METRIC_CHART_THEMES: Record<DemandMetricId, DemandMetricChartTheme> = {
  composite: {
    stroke: "#0f766e",
    fillFrom: "#14b8a6",
    cardSelected: "border-teal-500 ring-2 ring-teal-200",
    cellActive: "bg-teal-100 ring-1 ring-teal-300",
    cellHover: "hover:bg-teal-50",
    rowBg: "bg-teal-50/50",
  },
  sale: {
    stroke: "#2563eb",
    fillFrom: "#3b82f6",
    cardSelected: "border-blue-500 ring-2 ring-blue-200",
    cellActive: "bg-blue-100 ring-1 ring-blue-300",
    cellHover: "hover:bg-blue-50",
    rowBg: "bg-blue-50/50",
  },
  jeonse: {
    stroke: "#d97706",
    fillFrom: "#f59e0b",
    cardSelected: "border-amber-500 ring-2 ring-amber-200",
    cellActive: "bg-amber-100 ring-1 ring-amber-300",
    cellHover: "hover:bg-amber-50",
    rowBg: "bg-amber-50/50",
  },
  packingInterest: {
    stroke: "#059669",
    fillFrom: "#10b981",
    cardSelected: "border-emerald-500 ring-2 ring-emerald-200",
    cellActive: "bg-emerald-100 ring-1 ring-emerald-300",
    cellHover: "hover:bg-emerald-50",
    rowBg: "bg-emerald-50/50",
  },
  packingVolume: {
    stroke: "#059669",
    fillFrom: "#10b981",
    cardSelected: "border-emerald-500 ring-2 ring-emerald-200",
    cellActive: "bg-emerald-100 ring-1 ring-emerald-300",
    cellHover: "hover:bg-emerald-50",
    rowBg: "bg-emerald-50/50",
  },
  packingIndex: {
    stroke: "#7c3aed",
    fillFrom: "#8b5cf6",
    cardSelected: "border-violet-500 ring-2 ring-violet-200",
    cellActive: "bg-violet-100 ring-1 ring-violet-300",
    cellHover: "hover:bg-violet-50",
    rowBg: "bg-violet-50/50",
  },
  moveInVolume: {
    stroke: "#0284c7",
    fillFrom: "#0ea5e9",
    cardSelected: "border-sky-500 ring-2 ring-sky-200",
    cellActive: "bg-sky-100 ring-1 ring-sky-300",
    cellHover: "hover:bg-sky-50",
    rowBg: "bg-sky-50/50",
  },
  moveInIndex: {
    stroke: "#db2777",
    fillFrom: "#ec4899",
    cardSelected: "border-pink-500 ring-2 ring-pink-200",
    cellActive: "bg-pink-100 ring-1 ring-pink-300",
    cellHover: "hover:bg-pink-50",
    rowBg: "bg-pink-50/50",
  },
};

export function demandMetricChartTheme(metricId: DemandMetricId): DemandMetricChartTheme {
  return DEMAND_METRIC_CHART_THEMES[metricId];
}

/** 지역 비교 차트 선 색 (최대 3곳) */
export const DEMAND_REGION_COMPARE_COLORS = ["#2563eb", "#ea580c", "#7c3aed"] as const;

export function demandRegionCompareColor(index: number): string {
  return DEMAND_REGION_COMPARE_COLORS[index % DEMAND_REGION_COMPARE_COLORS.length];
}
