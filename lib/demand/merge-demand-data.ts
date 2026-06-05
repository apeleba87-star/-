import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";

export function mergeDemandKeywordStores(
  base: DemandKeywordStore,
  patch: DemandKeywordStore
): DemandKeywordStore {
  return {
    byRegion: { ...base.byRegion, ...patch.byRegion },
  };
}

export function mergeRtmsSeries(
  base: DemandRtmsSeriesStore,
  patch: DemandRtmsSeriesStore
): DemandRtmsSeriesStore {
  return { ...base, ...patch };
}
