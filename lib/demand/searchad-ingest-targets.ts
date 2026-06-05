import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import { listNationalBasketIngestPhrases } from "@/lib/demand/keyword-baskets";
import {
  buildRegionSearchPhrases,
  demandKeywordRegionRefFromSelection,
  listAllDistrictKeywordTargets,
  type DemandKeywordRegionRef,
} from "@/lib/demand/region-search-keywords";

export type SearchAdIngestTarget = {
  region: DemandKeywordRegionRef;
  keywordKey: DemandKeywordKey;
  phrase: string;
};

/** 허브 UI·일별 롤링 30일 — 전국 Basket + (선택) 시·도 시 단위 */
export function buildSearchAdHubIngestTargets(cityId?: string): SearchAdIngestTarget[] {
  const targets: SearchAdIngestTarget[] = [];

  const nationalRef = demandKeywordRegionRefFromSelection({ scope: "national" });
  if (nationalRef) {
    for (const item of listNationalBasketIngestPhrases()) {
      if (item.basketId === "hand_free") continue;
      targets.push({
        region: nationalRef,
        keywordKey: item.keywordKey,
        phrase: item.phrase,
      });
    }
  }

  if (cityId) {
    const cityPhrases = buildRegionSearchPhrases({ scope: "city", cityId });
    if (cityPhrases) {
      const region: DemandKeywordRegionRef = { regionScope: "city", regionKey: cityId };
      targets.push(
        { region, keywordKey: "packing", phrase: cityPhrases.packing },
        { region, keywordKey: "move_in_clean", phrase: cityPhrases.moveInClean }
      );
    }
  }

  return targets;
}

/** 월별 아카이브 — 허브 + 손없는날 + 시·도 구별 DB 축적 */
export function buildSearchAdArchiveIngestTargets(cityId?: string): SearchAdIngestTarget[] {
  const targets = buildSearchAdHubIngestTargets(cityId);

  const nationalRef = demandKeywordRegionRefFromSelection({ scope: "national" });
  if (nationalRef) {
    for (const item of listNationalBasketIngestPhrases()) {
      if (item.basketId !== "hand_free") continue;
      targets.push({
        region: nationalRef,
        keywordKey: item.keywordKey,
        phrase: item.phrase,
      });
    }
  }

  for (const d of listAllDistrictKeywordTargets(cityId)) {
    targets.push(
      {
        region: { regionScope: "district", regionKey: d.regionKey },
        keywordKey: "packing",
        phrase: d.phrases.packing,
      },
      {
        region: { regionScope: "district", regionKey: d.regionKey },
        keywordKey: "move_in_clean",
        phrase: d.phrases.moveInClean,
      }
    );
  }

  return targets;
}
