import {
  districtDemandScoreFromMoveInResult,
  nationalOnlyDemandScore,
  type DistrictDemandScore,
} from "@/lib/demand/district-demand-score";
import { MOVE_IN_DEMAND_SIGNAL_LAG_MONTHS } from "@/lib/demand/demand-score-weights";
import {
  availableSignalMonths,
  buildNationalMoveInSignal,
  computeMoveInDemandScoreForRegion,
  districtMedianActivityFromSnapshot,
  districtMedianForSignal,
  getMoveInDemandTargetYyyymm,
  nationalMapsFromKeywordStore,
  nationalMovingInterestFromSignal,
  resolveSignalYyyymmForTarget,
  shiftYyyymm,
  type MoveInDemandScoreResult,
} from "@/lib/demand/move-in-demand-score";
import { nationalMovingInterestFromStore } from "@/lib/demand/moving-interest";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import { SEOUL_GU_SLUG_TO_NAME } from "@/lib/demand/slugs";
import type { DemandRtmsDistrictSnapshot, DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";

export type DemandScoreContext = {
  keywordStore: DemandKeywordStore | null | undefined;
  rtmsSeries: DemandRtmsSeriesStore;
  targetYyyymm: string;
  signalYyyymm: string | null;
  /** RTMS 스냅샷 최신월 — median override는 신호월과 같을 때만 */
  rtmsSnapshotYyyymm?: string | null;
  districtMedianActivity?: number | null;
  /** 전국 시군구 RTMS 활동량 중앙값 — lazy load 시 그래프·카드 일치 (RSC 직렬화용 plain object) */
  districtMedianByYyyymm?: Readonly<Record<string, number>>;
};

export type SeoulDemandRankingRow = {
  slug: string;
  gu: string;
  score: DistrictDemandScore;
  rank: number;
};

export function buildDemandScoreContext(
  keywordStore: DemandKeywordStore | null | undefined,
  rtmsSignalYyyymm: string | null,
  rtmsSeries: DemandRtmsSeriesStore = {},
  rtmsSnapshot?: DemandRtmsDistrictSnapshot | null,
  districtMedianByYyyymm?: Readonly<Record<string, number>>
): DemandScoreContext {
  const targetYyyymm = getMoveInDemandTargetYyyymm();
  const maps = nationalMapsFromKeywordStore(keywordStore);
  const availableMonths = availableSignalMonths(
    maps.packingVolByYm,
    maps.moveInVolByYm,
    rtmsSeries,
    "district:seoul:gangnam-gu"
  );
  const idealSignalYyyymm = shiftYyyymm(targetYyyymm, -MOVE_IN_DEMAND_SIGNAL_LAG_MONTHS);
  const resolvedSignalYyyymm = resolveSignalYyyymmForTarget(targetYyyymm, availableMonths);
  // RTMS 스냅샷 최신월(미확정·신호월 초과)을 신호월로 쓰면 전국 검색 미수집 → 카드 100 폴백
  const signalYyyymm =
    rtmsSignalYyyymm &&
    rtmsSignalYyyymm <= idealSignalYyyymm &&
    availableMonths.includes(rtmsSignalYyyymm)
      ? rtmsSignalYyyymm
      : resolvedSignalYyyymm;

  const districtMedianActivity =
    rtmsSnapshot?.byRegionKey && Object.keys(rtmsSnapshot.byRegionKey).length > 0
      ? districtMedianActivityFromSnapshot(rtmsSnapshot.byRegionKey)
      : null;

  return {
    keywordStore,
    rtmsSeries,
    targetYyyymm,
    signalYyyymm,
    rtmsSnapshotYyyymm: rtmsSignalYyyymm,
    districtMedianActivity,
    districtMedianByYyyymm,
  };
}

function rtmsStoreKey(regionKey: string): string {
  if (regionKey.startsWith("district:") || regionKey.startsWith("city:")) return regionKey;
  return `district:${regionKey}`;
}

function medianOverrideForSignal(
  context: DemandScoreContext,
  signalYm: string
): number {
  return districtMedianForSignal(context, context.rtmsSeries, signalYm);
}

/** 카드·그래프 동일 — 대상월 T, 신호 S=T−1 (차트 월별 시리즈와 동일) */
function computeRegionalScoreForTarget(
  context: DemandScoreContext,
  rtmsKey: string
): MoveInDemandScoreResult | null {
  const targetYyyymm = context.targetYyyymm;
  const idealSignal = shiftYyyymm(targetYyyymm, -MOVE_IN_DEMAND_SIGNAL_LAG_MONTHS);

  const direct = computeMoveInDemandScoreForRegion(
    targetYyyymm,
    idealSignal,
    context.keywordStore,
    context.rtmsSeries,
    rtmsKey,
    medianOverrideForSignal(context, idealSignal)
  );
  if (direct) return direct;

  const regionSeries = context.rtmsSeries[rtmsKey] ?? [];
  const signals = [...regionSeries].map((p) => p.yyyymm).sort();
  for (let i = signals.length - 1; i >= 0; i -= 1) {
    const signalYm = signals[i]!;
    const target = shiftYyyymm(signalYm, MOVE_IN_DEMAND_SIGNAL_LAG_MONTHS);
    const result = computeMoveInDemandScoreForRegion(
      target,
      signalYm,
      context.keywordStore,
      context.rtmsSeries,
      rtmsKey,
      medianOverrideForSignal(context, signalYm)
    );
    if (result && target === targetYyyymm) return result;
  }
  return null;
}

export function districtDemandScoreForRegionKey(
  context: DemandScoreContext,
  regionKey: string
): DistrictDemandScore {
  const rtmsKey = rtmsStoreKey(regionKey);
  const result = computeRegionalScoreForTarget(context, rtmsKey);

  if (!result) {
    const national = nationalMovingInterestFromStore(context.keywordStore);
    return nationalOnlyDemandScore(national, context.targetYyyymm);
  }

  return districtDemandScoreFromMoveInResult(result);
}

/** @deprecated districtDemandScoreForRegionKey 사용 */
export function districtDemandScoreForSlug(
  context: DemandScoreContext,
  slug: string
): DistrictDemandScore {
  return districtDemandScoreForRegionKey(context, `seoul:${slug}`);
}

export function demandScoreForNational(context: DemandScoreContext): DistrictDemandScore {
  const signalYm = context.signalYyyymm;
  if (!signalYm) {
    return nationalOnlyDemandScore(
      nationalMovingInterestFromStore(context.keywordStore),
      context.targetYyyymm
    );
  }

  const maps = nationalMapsFromKeywordStore(context.keywordStore);
  const nationalSignal = buildNationalMoveInSignal(
    signalYm,
    maps.packingVolByYm,
    maps.moveInVolByYm,
    maps.packingIdxByYm,
    maps.moveInIdxByYm
  );

  if (!nationalSignal) {
    return nationalOnlyDemandScore(
      nationalMovingInterestFromStore(context.keywordStore),
      context.targetYyyymm
    );
  }

  return nationalOnlyDemandScore(
    nationalMovingInterestFromSignal(nationalSignal),
    context.targetYyyymm
  );
}

export function demandScoreForCity(
  context: DemandScoreContext,
  cityId = "seoul"
): DistrictDemandScore {
  const result = computeRegionalScoreForTarget(context, `city:${cityId}`);

  if (!result) {
    return demandScoreForNational(context);
  }

  return districtDemandScoreFromMoveInResult(result);
}

export function buildSeoulDemandRanking(context: DemandScoreContext): SeoulDemandRankingRow[] {
  const rows = Object.entries(SEOUL_GU_SLUG_TO_NAME).map(([slug, gu]) => ({
    slug,
    gu,
    score: districtDemandScoreForSlug(context, slug),
    rank: 0,
  }));

  rows.sort((a, b) => b.score.score - a.score.score);
  rows.forEach((row, i) => {
    row.rank = i + 1;
  });
  return rows;
}
