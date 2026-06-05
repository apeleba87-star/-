import { DEMAND_METRIC_LABELS } from "@/lib/demand/copy";

/** 클릭 → 차트에 연결되는 지표 ID */
export type DemandMetricId =
  | "sale"
  | "jeonse"
  /** @deprecated 개발·검증용 */
  | "packingInterest"
  | "packingVolume"
  | "packingIndex"
  | "moveInVolume"
  | "moveInIndex"
  | "demandScore";

/** 허브·비교표에 노출하는 지표 */
/** 구 선택 시 — RTMS·지역수요점수만 */
export const DEMAND_HUB_DISTRICT_METRIC_IDS: DemandMetricId[] = [
  "demandScore",
  "sale",
  "jeonse",
];

export const DEMAND_HUB_METRIC_IDS: DemandMetricId[] = [
  "demandScore",
  "sale",
  "jeonse",
  "packingVolume",
  "packingIndex",
  "moveInVolume",
  "moveInIndex",
];

export function isDemandSearchMetricId(id: DemandMetricId): boolean {
  return (
    id === "packingVolume" ||
    id === "packingIndex" ||
    id === "moveInVolume" ||
    id === "moveInIndex" ||
    id === "packingInterest"
  );
}

/** 허브 차트 — 검색량·검색지수는 전국만 (구별 라인·범례 없음) */
export function isDemandKeywordChartMetric(id: DemandMetricId): boolean {
  return (
    id === "packingVolume" ||
    id === "packingIndex" ||
    id === "moveInVolume" ||
    id === "moveInIndex"
  );
}

export const DEMAND_METRIC_IDS: DemandMetricId[] = [
  "sale",
  "jeonse",
  "packingInterest",
  "packingVolume",
  "packingIndex",
  "moveInVolume",
  "moveInIndex",
  "demandScore",
];

export function demandMetricLabel(id: DemandMetricId): string {
  switch (id) {
    case "sale":
      return DEMAND_METRIC_LABELS.sale;
    case "jeonse":
      return DEMAND_METRIC_LABELS.jeonse;
    case "packingInterest":
      return DEMAND_METRIC_LABELS.packingInterest;
    case "packingVolume":
      return DEMAND_METRIC_LABELS.packingVolume;
    case "packingIndex":
      return DEMAND_METRIC_LABELS.packingIndex;
    case "moveInVolume":
      return DEMAND_METRIC_LABELS.moveInVolume;
    case "moveInIndex":
      return DEMAND_METRIC_LABELS.moveInIndex;
    case "demandScore":
      return DEMAND_METRIC_LABELS.demandScore;
  }
}

export function isDemandMetricId(v: string): v is DemandMetricId {
  return (DEMAND_METRIC_IDS as string[]).includes(v);
}

export function isDemandTradeMetric(metricId: DemandMetricId): boolean {
  return metricId === "sale" || metricId === "jeonse";
}
