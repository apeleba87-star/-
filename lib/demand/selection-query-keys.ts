import type { DemandRegionSelection } from "@/lib/demand/regions";
import { demandDistrictRegionKey } from "@/lib/demand/regions";
import type { DemandKeywordRegionRef } from "@/lib/demand/region-search-keywords";
import { demandKeywordRegionRefFromSelection } from "@/lib/demand/region-search-keywords";

export function demandRtmsSeriesKeyForSelection(selection: DemandRegionSelection): string {
  if (selection.scope === "national") return "national:kr";
  if (selection.scope === "city") return `city:${selection.cityId}`;
  return `district:${demandDistrictRegionKey(selection.cityId, selection.guSlug)}`;
}

export function demandQueryKeysForSelections(selections: DemandRegionSelection[]): {
  keywordRefs: DemandKeywordRegionRef[];
  rtmsKeys: string[];
} {
  const keywordRefMap = new Map<string, DemandKeywordRegionRef>();
  const rtmsKeySet = new Set<string>();

  for (const sel of selections) {
    const ref = demandKeywordRegionRefFromSelection(sel);
    if (ref) {
      keywordRefMap.set(`${ref.regionScope}:${ref.regionKey}`, ref);
    }
    rtmsKeySet.add(demandRtmsSeriesKeyForSelection(sel));
  }

  // 수요점수·전국 지표용
  keywordRefMap.set("national:kr", { regionScope: "national", regionKey: "kr" });
  rtmsKeySet.add("national:kr");

  return {
    keywordRefs: [...keywordRefMap.values()],
    rtmsKeys: [...rtmsKeySet],
  };
}
