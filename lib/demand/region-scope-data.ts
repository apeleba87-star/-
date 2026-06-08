import { getDemandKeywordStoreForRegions } from "@/lib/demand/keyword-query";
import type { DemandRegionSelection } from "@/lib/demand/regions";
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

/** lazy load API — DB 직조회 (재수집 직후 stale 캐시 방지) */
export function getCachedDemandRegionScopeData(
  selections: DemandRegionSelection[]
): Promise<DemandRegionScopePayload> {
  return getDemandRegionScopeData(selections);
}
