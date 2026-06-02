import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";

export type DemandKeywordChartPoint = { period: string; value: number };

/** 지역별 검색 지표 묶음 (서버 → 클라이언트) */
export type DemandKeywordRegionBundle = {
  phrases: { packing: string; moveInClean: string };
  packing: DemandKeywordMetricSlice;
  moveInClean: DemandKeywordMetricSlice;
  dailySeries: Record<DemandKeywordKey, DemandKeywordChartPoint[]>;
  /** DataLab timeUnit=month (최근 12개월) */
  monthlyIndexSeries: Record<DemandKeywordKey, DemandKeywordChartPoint[]>;
  /** 검색광고 월별 스냅샷(매월 수집 누적, 최대 12개월) */
  volumeMonthlySeries: Record<DemandKeywordKey, DemandKeywordChartPoint[]>;
  source: { datalab: "live" | "dummy"; volume: "live" | "dummy" };
};

export type DemandKeywordStore = {
  byRegion: Record<string, DemandKeywordRegionBundle>;
};

/** @deprecated 단일 전국 번들 — 비교·폴백용 */
export type DemandKeywordHubData = DemandKeywordRegionBundle;

export function demandKeywordKeyForMetric(
  metricId: "packingIndex" | "moveInIndex" | "packingVolume" | "moveInVolume"
): DemandKeywordKey {
  return metricId === "packingIndex" || metricId === "packingVolume" ? "packing" : "move_in_clean";
}
