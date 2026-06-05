import {
  districtDemandScoreFromMoveInResult,
  nationalOnlyDemandScore,
  type DistrictDemandScore,
} from "@/lib/demand/district-demand-score";
import {
  availableSignalMonths,
  buildNationalMoveInSignal,
  computeMoveInDemandScoreForRegion,
  districtMedianActivityFromSnapshot,
  getMoveInDemandTargetYyyymm,
  nationalMapsFromKeywordStore,
  nationalMovingInterestFromSignal,
  resolveSignalYyyymmForTarget,
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
  districtMedianActivity?: number | null;
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
  rtmsSnapshot?: DemandRtmsDistrictSnapshot | null
): DemandScoreContext {
  const targetYyyymm = getMoveInDemandTargetYyyymm();
  const maps = nationalMapsFromKeywordStore(keywordStore);
  const signalYyyymm =
    rtmsSignalYyyymm ??
    resolveSignalYyyymmForTarget(
      targetYyyymm,
      availableSignalMonths(maps.packingVolByYm, maps.moveInVolByYm, rtmsSeries, "district:seoul:gangnam-gu")
    );

  const districtMedianActivity =
    rtmsSnapshot?.byRegionKey && Object.keys(rtmsSnapshot.byRegionKey).length > 0
      ? districtMedianActivityFromSnapshot(rtmsSnapshot.byRegionKey)
      : null;

  return {
    keywordStore,
    rtmsSeries,
    targetYyyymm,
    signalYyyymm,
    districtMedianActivity,
  };
}

export function districtDemandScoreForRegionKey(
  context: DemandScoreContext,
  regionKey: string
): DistrictDemandScore {
  const signalYm = context.signalYyyymm;
  if (!signalYm) {
    const national = nationalMovingInterestFromStore(context.keywordStore);
    return nationalOnlyDemandScore(national, context.targetYyyymm);
  }

  const result = computeMoveInDemandScoreForRegion(
    context.targetYyyymm,
    signalYm,
    context.keywordStore,
    context.rtmsSeries,
    `district:${regionKey}`,
    context.districtMedianActivity
  );

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
  const signalYm = context.signalYyyymm;
  if (!signalYm) {
    return demandScoreForNational(context);
  }

  const result = computeMoveInDemandScoreForRegion(
    context.targetYyyymm,
    signalYm,
    context.keywordStore,
    context.rtmsSeries,
    `city:${cityId}`,
    context.districtMedianActivity
  );

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
