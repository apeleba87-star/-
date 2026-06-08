import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import { demandKeywordRegionRefFromSelection } from "@/lib/demand/region-search-keywords";
import { demandRtmsSeriesKeyForSelection } from "@/lib/demand/selection-query-keys";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";

function hasNationalKeywordBundle(keywordStore: DemandKeywordStore | null | undefined): boolean {
  return Boolean(keywordStore?.byRegion["national:kr"] ?? keywordStore?.byRegion.kr);
}

/** 시군구 — 전부 0인 구(재수집 전 캐시)는 미로드로 간주 */
function districtRtmsSeriesUsable(
  rtmsSeries: DemandRtmsSeriesStore,
  rtmsKey: string
): boolean {
  const points = rtmsSeries[rtmsKey];
  if (!points?.length) return false;
  return points.some((p) => p.saleCount > 0 || p.jeonseCount > 0);
}

/** bootstrap·lazy load에 해당 지역 데이터가 이미 있는지 */
export function isDemandRegionScopeLoaded(
  selection: DemandRegionSelection,
  keywordStore: DemandKeywordStore | null | undefined,
  rtmsSeries: DemandRtmsSeriesStore
): boolean {
  if (!demandKeywordRegionRefFromSelection(selection)) return false;
  if (!hasNationalKeywordBundle(keywordStore)) return false;
  const rtmsKey = demandRtmsSeriesKeyForSelection(selection);
  if (selection.scope === "district") {
    return districtRtmsSeriesUsable(rtmsSeries, rtmsKey);
  }
  return Boolean(rtmsSeries[rtmsKey]?.length);
}
