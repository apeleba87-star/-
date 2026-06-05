import { basketMomPercent } from "@/lib/demand/basket-aggregate";
import {
  DEMAND_HAND_FREE_BASKET_PHRASES,
  DEMAND_MOVE_IN_BASKET_PHRASES,
  DEMAND_PACKING_BASKET_PHRASES,
} from "@/lib/demand/keyword-baskets";
import {
  NATIONAL_INTEREST_BASE,
  NATIONAL_INTEREST_CORE_WEIGHTS,
} from "@/lib/demand/demand-score-weights";
import type { DemandChartPoint } from "@/lib/demand/scope-data";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import { demandKeywordRegionStoreKey } from "@/lib/demand/region-search-keywords";
import {
  handFreeForwardDataReady,
  handFreeForwardLabelAfterSearch,
} from "@/lib/demand/hand-free-forward";

export type NationalBasketMoms = {
  packingMom: number | null;
  moveInMom: number | null;
  handFreeMom: number | null;
};

export type NationalMovingInterest = {
  /** 100 + 가중 MoM 합 */
  index: number;
  /** 가중 합산 MoM % (포장×0.4 + …) */
  changePct: number;
  moms: NationalBasketMoms;
  /** 최신 검색 월 yyyymm */
  searchYyyymm: string | null;
  /** 영업 참고용 앞 2달 손없는날 라벨 (예: 7·8월) */
  handFreeForwardLabel: string | null;
  handFreeMissing: boolean;
};

function latestYyyymmFromChart(points: DemandChartPoint[]): string | null {
  if (points.length === 0) return null;
  const period = points[points.length - 1]?.period ?? "";
  const kr = period.match(/^(\d{4})년\s*(\d{1,2})월$/);
  if (kr) {
    return `${kr[1]}-${String(Number(kr[2])).padStart(2, "0")}`;
  }
  const legacy = period.match(/^(\d{2})\.(\d{1,2})$/);
  if (!legacy) return null;
  return `20${legacy[1]}-${String(Number(legacy[2])).padStart(2, "0")}`;
}

/** 포장·입주만 — 손없는날은 보조 지표(UI)로만 노출 */
function weightedNationalCoreChange(moms: NationalBasketMoms): number {
  const w = NATIONAL_INTEREST_CORE_WEIGHTS;
  const packing = moms.packingMom ?? 0;
  const moveIn = moms.moveInMom ?? 0;
  const weightSum = w.packing + w.moveIn;
  return Math.round(((packing * w.packing + moveIn * w.moveIn) / weightSum) * 10) / 10;
}

export function computeNationalMovingInterest(
  moms: NationalBasketMoms,
  searchYyyymm: string | null,
  handFreeMissing: boolean,
  handFreeForwardLabel: string | null = null
): NationalMovingInterest {
  const changePct = weightedNationalCoreChange(moms);
  return {
    index: Math.round((NATIONAL_INTEREST_BASE + changePct) * 10) / 10,
    changePct,
    moms,
    searchYyyymm,
    handFreeForwardLabel,
    handFreeMissing,
  };
}

export function nationalMovingInterestFromStore(store: DemandKeywordStore | null | undefined): NationalMovingInterest {
  const nationalKey = demandKeywordRegionStoreKey({ regionScope: "national", regionKey: "kr" });
  const bundle = store?.byRegion[nationalKey];
  const packingSeries = bundle?.volumeMonthlySeries.packing ?? [];
  const moveInSeries = bundle?.volumeMonthlySeries.move_in_clean ?? [];
  const handFreeByPhrase = bundle?.handFreeVolumeByPhrase ?? {};
  const handFreeSeries = bundle?.handFreeVolumeMonthlySeries ?? [];

  const handFreeMissing = !handFreeForwardDataReady(handFreeByPhrase);
  const moms: NationalBasketMoms = {
    packingMom: basketMomPercent(packingSeries),
    moveInMom: basketMomPercent(moveInSeries),
    handFreeMom: handFreeMissing ? null : basketMomPercent(handFreeSeries),
  };

  const searchYyyymm =
    latestYyyymmFromChart(packingSeries) ??
    latestYyyymmFromChart(moveInSeries) ??
    latestYyyymmFromChart(handFreeSeries);

  const handFreeForwardLabel = handFreeMissing
    ? null
    : handFreeForwardLabelAfterSearch(searchYyyymm);

  return computeNationalMovingInterest(moms, searchYyyymm, handFreeMissing, handFreeForwardLabel);
}

export const NATIONAL_BASKET_PHRASE_LABELS = {
  packing: DEMAND_PACKING_BASKET_PHRASES,
  moveIn: DEMAND_MOVE_IN_BASKET_PHRASES,
  handFree: DEMAND_HAND_FREE_BASKET_PHRASES,
} as const;
