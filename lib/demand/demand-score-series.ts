import {
  buildMoveInDemandScoreMonthlySeries,
  buildNationalMoveInDemandScoreChartSeries,
} from "@/lib/demand/move-in-demand-score";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import type { DemandChartPoint } from "@/lib/demand/scope-data";

export function chartPeriodToYyyymm(period: string): string | null {
  const kr = period.match(/^(\d{4})년\s*(\d{1,2})월$/);
  if (kr) {
    return `${kr[1]}-${String(Number(kr[2])).padStart(2, "0")}`;
  }
  const legacy = period.match(/^(\d{2})\.(\d{1,2})$/);
  if (legacy) {
    return `20${legacy[1]}-${String(Number(legacy[2])).padStart(2, "0")}`;
  }
  return null;
}

export function yyyymmToDemandChartPeriod(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  if (!y || !m) return yyyymm;
  return `${y.slice(2)}.${Number(m)}`;
}

export function nationalInterestMonthlyPoints(
  keywordStore: DemandKeywordStore | null | undefined
): DemandChartPoint[] {
  return buildNationalMoveInDemandScoreChartSeries(keywordStore);
}

export function buildDistrictMoveInDemandScoreChartSeries(
  keywordStore: DemandKeywordStore | null | undefined,
  rtmsSeries: DemandRtmsSeriesStore,
  rtmsRegionKey: string
): DemandChartPoint[] {
  return buildMoveInDemandScoreMonthlySeries(keywordStore, rtmsSeries, rtmsRegionKey);
}

/** @deprecated V2 — buildMoveInDemandScoreMonthlySeries */
export function mergeDistrictDemandScoreMonthlyPoints(): DemandChartPoint[] {
  return [];
}

/** @deprecated V2 */
export function buildNationalInterestMonthlyByYyyymm(): Map<string, number> {
  return new Map();
}

/** @deprecated V2 */
export function buildDistrictRtmsIndexMonthlyByYyyymm(): Map<string, number> {
  return new Map();
}
