import { DEMAND_METRIC_LABELS } from "@/lib/demand/copy";

/** 클릭 → 차트에 연결되는 지표 ID */
export type DemandMetricId =
  | "sale"
  | "jeonse"
  /** 표시 전용 — 포장이사 검색량·검색지수 통합 */
  | "packingInterest"
  | "packingVolume"
  | "packingIndex"
  | "moveInVolume"
  | "moveInIndex"
  | "composite";

/** 허브·비교표에 노출하는 지표 (포장이사는 관심지수 1개만) */
export const DEMAND_HUB_METRIC_IDS: DemandMetricId[] = [
  "composite",
  "sale",
  "jeonse",
  "packingInterest",
  "moveInVolume",
  "moveInIndex",
];

export const DEMAND_METRIC_IDS: DemandMetricId[] = [
  "sale",
  "jeonse",
  "packingInterest",
  "packingVolume",
  "packingIndex",
  "moveInVolume",
  "moveInIndex",
  "composite",
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
    case "composite":
      return DEMAND_METRIC_LABELS.composite;
  }
}

export function isDemandMetricId(v: string): v is DemandMetricId {
  return (DEMAND_METRIC_IDS as string[]).includes(v);
}

export function isDemandTradeMetric(metricId: DemandMetricId): boolean {
  return metricId === "sale" || metricId === "jeonse";
}
