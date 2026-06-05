import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import { listNationalBasketIngestPhrases } from "@/lib/demand/keyword-baskets";
import {
  buildRegionSearchPhrases,
  demandKeywordRegionRefFromSelection,
  listSeoulDistrictKeywordTargets,
  type DemandKeywordRegionRef,
} from "@/lib/demand/region-search-keywords";

export type SearchAdIngestTarget = {
  region: DemandKeywordRegionRef;
  keywordKey: DemandKeywordKey;
  phrase: string;
};

/** 허브 UI·일별 롤링 30일 — 전국 Basket(포장·입주) + 서울 시 */
export function buildSearchAdHubIngestTargets(): SearchAdIngestTarget[] {
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

  const cityPhrases = buildRegionSearchPhrases({ scope: "city", cityId: "seoul" });
  if (cityPhrases) {
    const region: DemandKeywordRegionRef = { regionScope: "city", regionKey: "seoul" };
    targets.push(
      { region, keywordKey: "packing", phrase: cityPhrases.packing },
      { region, keywordKey: "move_in_clean", phrase: cityPhrases.moveInClean }
    );
  }

  return targets;
}

/** 월별 아카이브 — 허브 + 25구×2 (구별 DB 축적) */
export function buildSearchAdArchiveIngestTargets(): SearchAdIngestTarget[] {
  const targets = buildSearchAdHubIngestTargets();

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

  for (const d of listSeoulDistrictKeywordTargets()) {
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
