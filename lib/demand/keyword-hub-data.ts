import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";

/** 서버에서 조회 후 클라이언트로 전달 — DB import 금지 */
export type DemandKeywordHubData = {
  source: { datalab: "live" | "dummy"; volume: "live" | "dummy" };
  packing: DemandKeywordMetricSlice;
  moveInClean: DemandKeywordMetricSlice;
  dailySeries: Record<DemandKeywordKey, { period: string; value: number }[]>;
};

export function demandKeywordKeyForMetric(
  metricId: "packingIndex" | "moveInIndex" | "packingVolume" | "moveInVolume"
): DemandKeywordKey {
  return metricId === "packingIndex" || metricId === "packingVolume" ? "packing" : "move_in_clean";
}
