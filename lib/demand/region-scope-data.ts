import { unstable_cache } from "next/cache";
import { DEMAND_HUB_REVALIDATE_SEC } from "@/lib/demand/demand-cache";
import { getDemandKeywordStoreForRegions } from "@/lib/demand/keyword-query";
import { demandRegionSelectionKey, type DemandRegionSelection } from "@/lib/demand/regions";
import { demandQueryKeysForSelections } from "@/lib/demand/selection-query-keys";
import { getDemandRtmsSeriesForKeys } from "@/lib/demand/rtms-query";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";

export type DemandRegionScopePayload = {
  keywordStore: DemandKeywordStore;
  rtmsSeries: DemandRtmsSeriesStore;
};

export type DemandRegionScopeResponse = DemandRegionScopePayload & {
  access: import("@/lib/demand/usage-limits").DemandUsageAccess;
  quotaBlockedKeys: string[];
};

/** 선택 지역 키워드·RTMS 시계열 (허브 lazy load) */
export async function getDemandRegionScopeData(
  selections: DemandRegionSelection[]
): Promise<DemandRegionScopePayload> {
  const { keywordRefs, rtmsKeys } = demandQueryKeysForSelections(selections);
  const [keywordStore, rtmsSeries] = await Promise.all([
    getDemandKeywordStoreForRegions(keywordRefs),
    getDemandRtmsSeriesForKeys(rtmsKeys),
  ]);
  return { keywordStore, rtmsSeries };
}

function regionScopeCacheKey(selections: DemandRegionSelection[]): string {
  return selections
    .map((s) => demandRegionSelectionKey(s))
    .sort()
    .join("|");
}

/** lazy load API — 지역별 1시간 캐시 */
export function getCachedDemandRegionScopeData(
  selections: DemandRegionSelection[]
): Promise<DemandRegionScopePayload> {
  const key = regionScopeCacheKey(selections);
  return unstable_cache(
    () => getDemandRegionScopeData(selections),
    [`demand-region-scope-${key}`],
    {
      revalidate: DEMAND_HUB_REVALIDATE_SEC,
      tags: ["demand-keyword", "demand-rtms"],
    }
  )();
}
