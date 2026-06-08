import { buildDailyPulseData } from "@/lib/demand/daily-pulse";
import {
  HUB_BOOTSTRAP_KEYWORD_DAYS,
  HUB_BOOTSTRAP_RTMS_MONTHS,
} from "@/lib/demand/hub-constants";
import { getDemandKeywordStoreForRegions } from "@/lib/demand/keyword-query";
import { getDemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";
import type { DemandKeywordRegionRef } from "@/lib/demand/region-search-keywords";
import {
  getDemandRtmsDistrictMedianByYyyymm,
  getDemandRtmsDistrictSnapshot,
  getDemandRtmsSeriesForKeys,
} from "@/lib/demand/rtms-query";
import type { DemandRtmsDistrictSnapshot } from "@/lib/demand/rtms-types";
import { buildDemandScoreContext } from "@/lib/demand/seoul-demand-ranking";
import { SEOUL_GU_SLUG_TO_NAME } from "@/lib/demand/slugs";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import type { DemandScoreContext } from "@/lib/demand/seoul-demand-ranking";
import type { DailyPulseData } from "@/lib/demand/daily-pulse";

export const HUB_BOOTSTRAP_RTMS_KEYS: string[] = [
  "national:kr",
  "city:seoul",
  ...Object.keys(SEOUL_GU_SLUG_TO_NAME).map((slug) => `district:seoul:${slug}`),
];

/** 수요점수는 전국 키워드 + 구별 RTMS만 사용 — 구 키워드 25벌 선로드 불필요 */
export function hubBootstrapKeywordRefs(): DemandKeywordRegionRef[] {
  return [
    { regionScope: "national", regionKey: "kr" },
    { regionScope: "city", regionKey: "seoul" },
  ];
}

export type DemandHubBootstrap = {
  rtmsSnapshot: DemandRtmsDistrictSnapshot;
  rtmsSeries: DemandRtmsSeriesStore;
  keywordStore: DemandKeywordStore;
  scoreContext: DemandScoreContext;
  dailyPulse: DailyPulseData;
};

/** 허브 SSR — 전국·서울만 선로드 (펄스·TOP5·기본 비교) */
export async function getDemandHubBootstrap(): Promise<DemandHubBootstrap> {
  const keywordRefs = hubBootstrapKeywordRefs();
  const rtmsOpts = { monthsBack: HUB_BOOTSTRAP_RTMS_MONTHS };
  const [rtmsSnapshot, rtmsSeries, keywordStore, districtMedianByYyyymm, nationalMetrics] =
    await Promise.all([
      getDemandRtmsDistrictSnapshot(),
      getDemandRtmsSeriesForKeys(HUB_BOOTSTRAP_RTMS_KEYS, rtmsOpts),
      getDemandKeywordStoreForRegions(keywordRefs, { dailySinceDays: HUB_BOOTSTRAP_KEYWORD_DAYS }),
      getDemandRtmsDistrictMedianByYyyymm(rtmsOpts),
      getDemandNationalKeywordMetrics(),
    ]);
  const scoreContext = buildDemandScoreContext(
    keywordStore,
    rtmsSnapshot.baseYyyymm,
    rtmsSeries,
    rtmsSnapshot,
    districtMedianByYyyymm
  );
  const dailyPulse = await buildDailyPulseData(
    keywordStore,
    scoreContext,
    rtmsSeries,
    nationalMetrics
  );

  return { rtmsSnapshot, rtmsSeries, keywordStore, scoreContext, dailyPulse };
}
