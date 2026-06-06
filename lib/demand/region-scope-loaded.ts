import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import { demandKeywordRegionRefFromSelection } from "@/lib/demand/region-search-keywords";
import { demandRtmsSeriesKeyForSelection } from "@/lib/demand/selection-query-keys";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";

function hasNationalKeywordBundle(keywordStore: DemandKeywordStore | null | undefined): boolean {
  return Boolean(keywordStore?.byRegion["national:kr"] ?? keywordStore?.byRegion.kr);
}

/** bootstrap·lazy load에 해당 지역 데이터가 이미 있는지 */
export function isDemandRegionScopeLoaded(
  selection: DemandRegionSelection,
  keywordStore: DemandKeywordStore | null | undefined,
  rtmsSeries: DemandRtmsSeriesStore
): boolean {
  if (!demandKeywordRegionRefFromSelection(selection)) return false;
  const rtmsKey = demandRtmsSeriesKeyForSelection(selection);
  const hasRtms = Boolean(rtmsSeries[rtmsKey]?.length);
  // 입주 예상 점수 차트는 전국 검색 + 해당 지역 RTMS만 있으면 됨
  return hasNationalKeywordBundle(keywordStore) && hasRtms;
}
