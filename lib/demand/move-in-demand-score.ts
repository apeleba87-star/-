import {
  MOVE_IN_DEMAND_BASELINE_MONTHS,
  MOVE_IN_DEMAND_SIGNAL_LAG_MONTHS,
  NATIONAL_SIGNAL_WEIGHTS,
  REGIONAL_RTMS_SIGNAL_WEIGHTS,
  RTMS_ACTIVITY_WEIGHTS,
} from "@/lib/demand/demand-score-weights";
import { computeDistrictRtmsIndex } from "@/lib/demand/district-rtms-index";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import { demandKeywordRegionStoreKey } from "@/lib/demand/region-search-keywords";
import type { DemandChartPoint } from "@/lib/demand/scope-data";
import type {
  DemandRtmsDistrictSnapshot,
  DemandRtmsMonthlyPoint,
  DemandRtmsSeriesStore,
} from "@/lib/demand/rtms-types";
import { getKstTodayString } from "@/lib/jobs/kst-date";

function chartPeriodToYyyymm(period: string): string | null {
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

function yyyymmToDemandChartPeriod(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  if (!y || !m) return yyyymm;
  return `${y.slice(2)}.${Number(m)}`;
}

export type NationalMoveInSignal = {
  signalYyyymm: string;
  packingVolumeIndex: number;
  moveInVolumeIndex: number;
  packingSearchIndex: number;
  moveInSearchIndex: number;
  compositeIndex: number;
};

export type RegionalMoveInSignal = {
  signalYyyymm: string;
  rtmsLevelIndex: number;
  rtmsMomentumIndex: number;
  compositeIndex: number;
  saleCount: number;
  jeonseCount: number;
  saleMom: number;
  jeonseMom: number;
};

export type MoveInDemandScoreResult = {
  score: number;
  targetYyyymm: string;
  signalYyyymm: string;
  national: NationalMoveInSignal;
  regional: RegionalMoveInSignal;
};

/** KST 달력 — 입주 수요 「대상월」(이번 달) */
export function getMoveInDemandTargetYyyymm(): string {
  return getKstTodayString().slice(0, 7);
}

export function shiftYyyymm(yyyymm: string, deltaMonths: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function medianPositive(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function normIndex100(value: number, baseline: number): number {
  if (!Number.isFinite(value) || value <= 0 || baseline <= 0) return 100;
  return Math.round((value / baseline) * 1000) / 10;
}

function momPercent(curr: number, prev: number): number {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function seriesToYyyymmMap(points: DemandChartPoint[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of points) {
    const ym = chartPeriodToYyyymm(p.period);
    if (ym && Number.isFinite(p.value)) out.set(ym, p.value);
  }
  return out;
}

function baselineForMonth(valuesByYm: Map<string, number>, signalYm: string): number {
  const months = [...valuesByYm.keys()].filter((ym) => ym <= signalYm).sort();
  const window = months.slice(-MOVE_IN_DEMAND_BASELINE_MONTHS);
  const vals = window.map((ym) => valuesByYm.get(ym) ?? 0);
  const med = medianPositive(vals);
  return med > 0 ? med : valuesByYm.get(signalYm) ?? 0;
}

function rtmsActivity(point: DemandRtmsMonthlyPoint): number {
  return (
    point.jeonseCount * RTMS_ACTIVITY_WEIGHTS.jeonse +
    point.saleCount * RTMS_ACTIVITY_WEIGHTS.sale
  );
}

function rtmsPointAt(series: DemandRtmsMonthlyPoint[], yyyymm: string): DemandRtmsMonthlyPoint | null {
  return series.find((p) => p.yyyymm === yyyymm) ?? null;
}

function districtSlugsFromSeries(rtmsSeries: DemandRtmsSeriesStore): string[] {
  return Object.keys(rtmsSeries)
    .filter((k) => k.startsWith("district:"))
    .map((k) => k.slice("district:".length));
}

function medianDistrictActivity(
  rtmsSeries: DemandRtmsSeriesStore,
  signalYm: string,
  districtMedianOverride?: number | null
): number {
  if (districtMedianOverride != null && districtMedianOverride > 0) {
    return districtMedianOverride;
  }
  const activities: number[] = [];
  for (const slug of districtSlugsFromSeries(rtmsSeries)) {
    const pt = rtmsPointAt(rtmsSeries[`district:${slug}`] ?? [], signalYm);
    if (pt) activities.push(rtmsActivity(pt));
  }
  return medianPositive(activities);
}

/** 전국 시군구 스냅샷(280곳) 기준 중앙 활동량 — lazy load 시 수요점수 보정 */
export function districtMedianActivityFromSnapshot(
  byRegionKey: DemandRtmsDistrictSnapshot["byRegionKey"]
): number {
  const activities = Object.values(byRegionKey).map((r) =>
    rtmsActivity({
      yyyymm: "",
      saleCount: r.saleCount,
      jeonseCount: r.jeonseCount,
    })
  );
  return medianPositive(activities);
}

export function resolveSignalYyyymmForTarget(
  targetYyyymm: string,
  availableMonths: string[],
  lagMonths = MOVE_IN_DEMAND_SIGNAL_LAG_MONTHS
): string | null {
  const ideal = shiftYyyymm(targetYyyymm, -lagMonths);
  const sorted = [...new Set(availableMonths)].sort();
  if (sorted.includes(ideal)) return ideal;
  const notAfterIdeal = sorted.filter((ym) => ym <= ideal);
  return notAfterIdeal.at(-1) ?? null;
}

export function buildNationalMoveInSignal(
  signalYm: string,
  packingVolByYm: Map<string, number>,
  moveInVolByYm: Map<string, number>,
  packingIdxByYm: Map<string, number>,
  moveInIdxByYm: Map<string, number>
): NationalMoveInSignal | null {
  const packingVol = packingVolByYm.get(signalYm);
  const moveInVol = moveInVolByYm.get(signalYm);
  const packingIdx = packingIdxByYm.get(signalYm);
  const moveInIdx = moveInIdxByYm.get(signalYm);

  if (
    packingVol == null &&
    moveInVol == null &&
    packingIdx == null &&
    moveInIdx == null
  ) {
    return null;
  }

  const w = NATIONAL_SIGNAL_WEIGHTS;
  const packingVolumeIndex = normIndex100(
    packingVol ?? 0,
    baselineForMonth(packingVolByYm, signalYm)
  );
  const moveInVolumeIndex = normIndex100(
    moveInVol ?? 0,
    baselineForMonth(moveInVolByYm, signalYm)
  );
  const packingSearchIndex = normIndex100(
    packingIdx ?? 0,
    baselineForMonth(packingIdxByYm, signalYm)
  );
  const moveInSearchIndex = normIndex100(
    moveInIdx ?? 0,
    baselineForMonth(moveInIdxByYm, signalYm)
  );

  const compositeIndex =
    Math.round(
      (packingVolumeIndex * w.packingVolume +
        moveInVolumeIndex * w.moveInVolume +
        packingSearchIndex * w.packingIndex +
        moveInSearchIndex * w.moveInIndex) *
        10
    ) / 10;

  return {
    signalYyyymm: signalYm,
    packingVolumeIndex,
    moveInVolumeIndex,
    packingSearchIndex,
    moveInSearchIndex,
    compositeIndex,
  };
}

export function buildRegionalMoveInSignal(
  signalYm: string,
  rtmsSeries: DemandRtmsMonthlyPoint[],
  districtMedianActivity: number
): RegionalMoveInSignal | null {
  const sorted = [...rtmsSeries].sort((a, b) => a.yyyymm.localeCompare(b.yyyymm));
  const idx = sorted.findIndex((p) => p.yyyymm === signalYm);
  if (idx < 0) return null;

  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const saleMom = prev ? momPercent(cur.saleCount, prev.saleCount) : 0;
  const jeonseMom = prev ? momPercent(cur.jeonseCount, prev.jeonseCount) : 0;
  const rtmsMomentumIndex = computeDistrictRtmsIndex({ saleMom, jeonseMom }).index;

  const activity = rtmsActivity(cur);
  const rtmsLevelIndex = normIndex100(activity, districtMedianActivity);

  const rw = REGIONAL_RTMS_SIGNAL_WEIGHTS;
  const compositeIndex =
    Math.round((rtmsLevelIndex * rw.level + rtmsMomentumIndex * rw.momentum) * 10) / 10;

  return {
    signalYyyymm: signalYm,
    rtmsLevelIndex,
    rtmsMomentumIndex,
    compositeIndex,
    saleCount: cur.saleCount,
    jeonseCount: cur.jeonseCount,
    saleMom,
    jeonseMom,
  };
}

export function computeMoveInDemandScoreFromSignals(
  targetYyyymm: string,
  national: NationalMoveInSignal,
  regional: RegionalMoveInSignal
): MoveInDemandScoreResult {
  const score =
    Math.round(((national.compositeIndex * regional.compositeIndex) / 100) * 10) / 10;
  return {
    score,
    targetYyyymm,
    signalYyyymm: national.signalYyyymm,
    national,
    regional,
  };
}

export function nationalMapsFromKeywordStore(store: DemandKeywordStore | null | undefined): {
  packingVolByYm: Map<string, number>;
  moveInVolByYm: Map<string, number>;
  packingIdxByYm: Map<string, number>;
  moveInIdxByYm: Map<string, number>;
} {
  const nationalKey = demandKeywordRegionStoreKey({ regionScope: "national", regionKey: "kr" });
  const bundle = store?.byRegion[nationalKey];
  return {
    packingVolByYm: seriesToYyyymmMap(bundle?.volumeMonthlySeries.packing ?? []),
    moveInVolByYm: seriesToYyyymmMap(bundle?.volumeMonthlySeries.move_in_clean ?? []),
    packingIdxByYm: seriesToYyyymmMap(bundle?.monthlyIndexSeries.packing ?? []),
    moveInIdxByYm: seriesToYyyymmMap(bundle?.monthlyIndexSeries.move_in_clean ?? []),
  };
}

export function availableSignalMonths(
  packingVolByYm: Map<string, number>,
  moveInVolByYm: Map<string, number>,
  rtmsSeries: DemandRtmsSeriesStore,
  regionKey: string
): string[] {
  const rtms = rtmsSeries[regionKey] ?? [];
  const rtmsMonths = rtms.map((p) => p.yyyymm);
  const searchMonths = [...new Set([...packingVolByYm.keys(), ...moveInVolByYm.keys()])];
  return [...new Set([...rtmsMonths, ...searchMonths])].sort();
}

export function computeMoveInDemandScoreForRegion(
  targetYyyymm: string,
  signalYm: string,
  keywordStore: DemandKeywordStore | null | undefined,
  rtmsSeries: DemandRtmsSeriesStore,
  rtmsRegionKey: string,
  districtMedianOverride?: number | null
): MoveInDemandScoreResult | null {
  const maps = nationalMapsFromKeywordStore(keywordStore);
  const national = buildNationalMoveInSignal(
    signalYm,
    maps.packingVolByYm,
    maps.moveInVolByYm,
    maps.packingIdxByYm,
    maps.moveInIdxByYm
  );
  if (!national) return null;

  const districtMedian = medianDistrictActivity(rtmsSeries, signalYm, districtMedianOverride);
  const regional = buildRegionalMoveInSignal(
    signalYm,
    rtmsSeries[rtmsRegionKey] ?? [],
    districtMedian
  );
  if (!regional) return null;

  return computeMoveInDemandScoreFromSignals(targetYyyymm, national, regional);
}

export function buildMoveInDemandScoreMonthlySeries(
  keywordStore: DemandKeywordStore | null | undefined,
  rtmsSeries: DemandRtmsSeriesStore,
  rtmsRegionKey: string
): DemandChartPoint[] {
  const maps = nationalMapsFromKeywordStore(keywordStore);
  const regionSeries = rtmsSeries[rtmsRegionKey] ?? [];
  const points: DemandChartPoint[] = [];

  for (const signalYm of regionSeries.map((p) => p.yyyymm)) {
    const targetYm = shiftYyyymm(signalYm, MOVE_IN_DEMAND_SIGNAL_LAG_MONTHS);
    const national = buildNationalMoveInSignal(
      signalYm,
      maps.packingVolByYm,
      maps.moveInVolByYm,
      maps.packingIdxByYm,
      maps.moveInIdxByYm
    );
    if (!national) continue;

    const regional = buildRegionalMoveInSignal(
      signalYm,
      regionSeries,
      medianDistrictActivity(rtmsSeries, signalYm)
    );
    if (!regional) continue;

    const result = computeMoveInDemandScoreFromSignals(targetYm, national, regional);
    points.push({
      period: yyyymmToDemandChartPeriod(targetYm),
      value: result.score,
    });
  }

  return points.sort((a, b) => {
    const ya = chartPeriodToYyyymm(a.period) ?? "";
    const yb = chartPeriodToYyyymm(b.period) ?? "";
    return ya.localeCompare(yb);
  });
}

/** 전국 입주·이사 수요 — 대상월 라벨 × 전국 composite */
export function buildNationalMoveInDemandScoreChartSeries(
  keywordStore: DemandKeywordStore | null | undefined
): DemandChartPoint[] {
  const maps = nationalMapsFromKeywordStore(keywordStore);
  const signalMonths = [
    ...new Set([
      ...maps.packingVolByYm.keys(),
      ...maps.moveInVolByYm.keys(),
      ...maps.packingIdxByYm.keys(),
      ...maps.moveInIdxByYm.keys(),
    ]),
  ].sort();

  const points: DemandChartPoint[] = [];
  for (const signalYm of signalMonths) {
    const national = buildNationalMoveInSignal(
      signalYm,
      maps.packingVolByYm,
      maps.moveInVolByYm,
      maps.packingIdxByYm,
      maps.moveInIdxByYm
    );
    if (!national) continue;
    const targetYm = shiftYyyymm(signalYm, MOVE_IN_DEMAND_SIGNAL_LAG_MONTHS);
    points.push({
      period: yyyymmToDemandChartPeriod(targetYm),
      value: national.compositeIndex,
    });
  }
  return points.sort((a, b) => {
    const ya = chartPeriodToYyyymm(a.period) ?? "";
    const yb = chartPeriodToYyyymm(b.period) ?? "";
    return ya.localeCompare(yb);
  });
}

/** 전국 이사 관심 strip — V2 national composite */
export function nationalMovingInterestFromSignal(
  signal: NationalMoveInSignal
): import("@/lib/demand/moving-interest").NationalMovingInterest {
  const changePct = Math.round((signal.compositeIndex - 100) * 10) / 10;
  return {
    index: signal.compositeIndex,
    changePct,
    moms: { packingMom: null, moveInMom: null, handFreeMom: null },
    searchYyyymm: signal.signalYyyymm,
    handFreeForwardLabel: null,
    handFreeMissing: true,
  };
}
