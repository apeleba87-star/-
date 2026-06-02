import { DEMAND_METRIC_LABELS } from "@/lib/demand/copy";

/** 클릭 → 차트에 연결되는 지표 ID */
export type DemandMetricId =
  | "sale"
  | "jeonse"
  | "packingVolume"
  | "packingIndex"
  | "moveInVolume"
  | "moveInIndex"
  | "composite";

export const DEMAND_METRIC_IDS: DemandMetricId[] = [
  "sale",
  "jeonse",
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
