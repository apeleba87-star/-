import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import type { HandFreeVolumeMonthRow } from "@/lib/demand/hand-free-forward";
import type { DemandKeywordIndexLevel } from "@/lib/demand/keyword-resolve";
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
  /** DataLab 일별 index_ratio — YYYY-MM-DD → 값 (30일 검색량 배분용) */
  dailyIndexByYmd: Record<DemandKeywordKey, Record<string, number>>;
  /** 검색광고 월별 — 손없는날 phrase별 (1~12월손없는날) */
  handFreeVolumeByPhrase: Record<string, HandFreeVolumeMonthRow[]>;
  /** 앞 2달 손없는날 합산 시계열 (MoM·차트용) */
  handFreeVolumeMonthlySeries: DemandKeywordChartPoint[];
  source: { datalab: "live" | "dummy"; volume: "live" | "dummy" };
  /** 검색광고 일별 롤링 30일 스냅샷일 (YYYY-MM-DD) */
  searchVolumeRollingSnapshotDate?: string | null;
  /** 카드·30일 차트 검색량 출처 */
  searchVolumeDisplaySource?: "rolling_30d" | "monthly_archive";
};

export type { HandFreeVolumeMonthRow } from "@/lib/demand/hand-free-forward";

export type DemandKeywordStore = {
  byRegion: Record<string, DemandKeywordRegionBundle>;
};

/** @deprecated 단일 전국 번들 — 비교·폴백용 */
export type DemandKeywordHubData = DemandKeywordRegionBundle;

export function demandKeywordKeyForMetric(
  metricId:
    | "packingInterest"
    | "packingIndex"
    | "moveInIndex"
    | "packingVolume"
    | "moveInVolume"
): DemandKeywordKey {
  return metricId === "moveInIndex" || metricId === "moveInVolume"
    ? "move_in_clean"
    : "packing";
}

/** 입주청소·포장이사 각각 — 구/시/전국 fallback·시계열 유무 (차트·푸터용) */
export function demandKeywordHasIndexData(
  row: {
    keywordIndexLevelByKey?: Partial<Record<DemandKeywordKey, DemandKeywordIndexLevel>>;
    keywordDailySeries?: Partial<Record<DemandKeywordKey, DemandKeywordChartPoint[]>>;
    keywordMonthlyIndexSeries?: Partial<Record<DemandKeywordKey, DemandKeywordChartPoint[]>>;
  },
  key: DemandKeywordKey
): boolean {
  const level = row.keywordIndexLevelByKey?.[key] ?? "dummy";
  if (level === "dummy") return false;
  const daily = row.keywordDailySeries?.[key]?.length ?? 0;
  const monthly = row.keywordMonthlyIndexSeries?.[key]?.length ?? 0;
  return daily > 0 || monthly > 0;
}
