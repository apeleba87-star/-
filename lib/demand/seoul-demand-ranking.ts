import {
  computeDistrictDemandScore,
  nationalOnlyDemandScore,
  type DistrictDemandScore,
} from "@/lib/demand/district-demand-score";
import {
  nationalMovingInterestFromStore,
  type NationalMovingInterest,
} from "@/lib/demand/moving-interest";
import type { DemandRtmsDistrictOverrides } from "@/lib/demand/scope-data";
import { DEMAND_TABLE_ROWS } from "@/lib/demand/table-data";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import { SEOUL_GU_SLUG_TO_NAME } from "@/lib/demand/slugs";

export type DemandScoreContext = {
  national: NationalMovingInterest;
  rtmsYyyymm: string | null;
};

export type SeoulDemandRankingRow = {
  slug: string;
  gu: string;
  score: DistrictDemandScore;
  rank: number;
};

export function buildDemandScoreContext(
  keywordStore: DemandKeywordStore | null | undefined,
  rtmsYyyymm: string | null
): DemandScoreContext {
  return {
    national: nationalMovingInterestFromStore(keywordStore),
    rtmsYyyymm,
  };
}

function scoreBasis(context: DemandScoreContext): {
  searchYyyymm: string | null;
  rtmsYyyymm: string | null;
  mixedMonths: boolean;
} {
  const searchYyyymm = context.national.searchYyyymm;
  const rtmsYyyymm = context.rtmsYyyymm;
  return {
    searchYyyymm,
    rtmsYyyymm,
    mixedMonths: Boolean(searchYyyymm && rtmsYyyymm && searchYyyymm !== rtmsYyyymm),
  };
}

export function districtDemandScoreForRtms(
  context: DemandScoreContext,
  saleMom: number,
  jeonseMom: number
): DistrictDemandScore {
  return computeDistrictDemandScore(
    context.national,
    { saleMom, jeonseMom },
    scoreBasis(context)
  );
}

export function demandScoreForNational(context: DemandScoreContext): DistrictDemandScore {
  return nationalOnlyDemandScore(context.national);
}

export function buildSeoulDemandRanking(
  context: DemandScoreContext,
  rtmsBySlug: DemandRtmsDistrictOverrides
): SeoulDemandRankingRow[] {
  const basis = scoreBasis(context);
  const rows = Object.entries(SEOUL_GU_SLUG_TO_NAME).map(([slug, gu]) => {
    const rtms = rtmsBySlug[slug];
    const table = DEMAND_TABLE_ROWS.find((r) => r.slug === slug);
    const saleMom = rtms?.saleMom ?? table?.saleMom ?? 0;
    const jeonseMom = rtms?.jeonseMom ?? table?.jeonseMom ?? 0;
    const score = computeDistrictDemandScore(
      context.national,
      { saleMom, jeonseMom },
      basis
    );
    return { slug, gu, score, rank: 0 };
  });
  rows.sort((a, b) => b.score.score - a.score.score);
  rows.forEach((row, i) => {
    row.rank = i + 1;
  });
  return rows;
}
