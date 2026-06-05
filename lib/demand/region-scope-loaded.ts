import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import {
  demandKeywordRegionRefFromSelection,
  demandKeywordRegionStoreKey,
} from "@/lib/demand/region-search-keywords";
import { demandRtmsSeriesKeyForSelection } from "@/lib/demand/selection-query-keys";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";

/** bootstrap·lazy load에 해당 지역 데이터가 이미 있는지 */
export function isDemandRegionScopeLoaded(
  selection: DemandRegionSelection,
  keywordStore: DemandKeywordStore | null | undefined,
  rtmsSeries: DemandRtmsSeriesStore
): boolean {
  const ref = demandKeywordRegionRefFromSelection(selection);
  if (!ref) return false;
  const storeKey = demandKeywordRegionStoreKey(ref);
  const hasKeyword = Boolean(keywordStore?.byRegion[storeKey]);
  const rtmsKey = demandRtmsSeriesKeyForSelection(selection);
  const hasRtms = Boolean(rtmsSeries[rtmsKey]?.length);
  return hasKeyword && hasRtms;
}
