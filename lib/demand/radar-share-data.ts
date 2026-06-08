import { unstable_cache } from "next/cache";
import { HUB_BOOTSTRAP_KEYWORD_DAYS, HUB_BOOTSTRAP_RTMS_MONTHS } from "@/lib/demand/hub-constants";
import { getDemandKeywordStoreForRegions } from "@/lib/demand/keyword-query";
import {
  buildRadarShareCopy,
  buildRadarShareCopyFallback,
  type RadarShareCopy,
} from "@/lib/demand/radar-share-copy";
import { parseRadarShareParam } from "@/lib/demand/radar-share";
import {
  getDemandRtmsDistrictMedianByYyyymm,
  getDemandRtmsDistrictSnapshot,
  getDemandRtmsSeriesForKeys,
} from "@/lib/demand/rtms-query";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import { buildDemandScopeRow, mergeRtmsDistrictOverrides } from "@/lib/demand/scope-data";
import { demandQueryKeysForSelections } from "@/lib/demand/selection-query-keys";
import { buildDemandScoreContext } from "@/lib/demand/seoul-demand-ranking";

async function loadRadarShareCopyForSelection(
  selection: DemandRegionSelection
): Promise<RadarShareCopy | null> {
  const { keywordRefs, rtmsKeys } = demandQueryKeysForSelections([selection]);
  const rtmsOpts = { monthsBack: HUB_BOOTSTRAP_RTMS_MONTHS };

  const [rtmsSnapshot, rtmsSeries, keywordStore, districtMedianByYyyymm] = await Promise.all([
    getDemandRtmsDistrictSnapshot(),
    getDemandRtmsSeriesForKeys(rtmsKeys, rtmsOpts),
    getDemandKeywordStoreForRegions(keywordRefs, { dailySinceDays: HUB_BOOTSTRAP_KEYWORD_DAYS }),
    getDemandRtmsDistrictMedianByYyyymm(rtmsOpts),
  ]);

  const scoreContext = buildDemandScoreContext(
    keywordStore,
    rtmsSnapshot.baseYyyymm,
    rtmsSeries,
    rtmsSnapshot,
    districtMedianByYyyymm
  );
  const merged = mergeRtmsDistrictOverrides(rtmsSnapshot.byRegionKey, rtmsSeries);
  const row = buildDemandScopeRow(selection, merged, keywordStore, scoreContext);
  if (!row) return buildRadarShareCopyFallback(selection);

  return buildRadarShareCopy({
    selection,
    placeLabel: row.pathLabel,
    score: row.demandScore.score,
    band: row.demandScore.band,
    jeonseMom: row.jeonseMom,
    moveInIndexMom: row.moveInClean.indexMomPercent,
  });
}

/** 공유 URL `?r=` — 카톡 OG·미리보기 (1시간 캐시) */
export function getCachedRadarShareCopy(shareParam: string): Promise<RadarShareCopy | null> {
  return unstable_cache(
    async () => {
      const selection = parseRadarShareParam(shareParam);
      if (!selection) return null;
      try {
        return await loadRadarShareCopyForSelection(selection);
      } catch {
        return buildRadarShareCopyFallback(selection);
      }
    },
    ["radar-share-copy-v1", shareParam],
    { revalidate: 3600, tags: ["demand-rtms", "demand-keyword"] }
  )();
}
