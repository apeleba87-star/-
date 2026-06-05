import { unstable_cache } from "next/cache";
import { getDemandHubBootstrap } from "@/lib/demand/hub-bootstrap";
import { getDemandKeywordStore } from "@/lib/demand/keyword-query";
import {
  getDemandRtmsDistrictSnapshot,
  getDemandRtmsMonthlySeries,
} from "@/lib/demand/rtms-query";

/** 입주수요 허브 — 일 1~3회 수집 기준, 1시간 캐시 */
export const DEMAND_HUB_REVALIDATE_SEC = 3600;

export function getCachedDemandRtmsDistrictSnapshot() {
  return unstable_cache(
    () => getDemandRtmsDistrictSnapshot(),
    ["demand-rtms-snapshot-v2"],
    { revalidate: DEMAND_HUB_REVALIDATE_SEC, tags: ["demand-rtms"] }
  )();
}

export function getCachedDemandRtmsMonthlySeries() {
  return unstable_cache(
    () => getDemandRtmsMonthlySeries(),
    ["demand-rtms-series-v2"],
    { revalidate: DEMAND_HUB_REVALIDATE_SEC, tags: ["demand-rtms"] }
  )();
}

export function getCachedDemandKeywordStore() {
  return unstable_cache(
    () => getDemandKeywordStore(),
    ["demand-keyword-store-v2"],
    { revalidate: DEMAND_HUB_REVALIDATE_SEC, tags: ["demand-keyword"] }
  )();
}

/** 허브 SSR — 전국·서울 bootstrap (lazy load와 함께 사용) */
export function getCachedDemandHubBootstrap() {
  return unstable_cache(
    () => getDemandHubBootstrap(),
    ["demand-hub-bootstrap-v1"],
    { revalidate: DEMAND_HUB_REVALIDATE_SEC, tags: ["demand-rtms", "demand-keyword"] }
  )();
}
