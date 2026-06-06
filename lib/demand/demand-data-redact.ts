import type { DailyPulseData, DailyPulseSparkSeries, DailyPulseTopDistrict } from "@/lib/demand/daily-pulse";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DemandHubBootstrap } from "@/lib/demand/hub-bootstrap";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import type { DemandRegionScopePayload } from "@/lib/demand/region-scope-data";
import type { DemandScoreContext } from "@/lib/demand/seoul-demand-ranking";

const PULSE_LOCKED = -1;

function lockSparkline(series: DailyPulseSparkSeries): DailyPulseSparkSeries {
  return {
    ...series,
    points: series.points.map((p) => ({ ...p, value: PULSE_LOCKED })),
  };
}

function lockTopDistrict(row: DailyPulseTopDistrict): DailyPulseTopDistrict {
  return {
    ...row,
    score: PULSE_LOCKED,
    regionalComposite: PULSE_LOCKED,
    jeonseCount: PULSE_LOCKED,
    saleCount: PULSE_LOCKED,
  };
}

/** 비로그인 — 펄스·TOP 구 숫자 제거 (이름·순위는 유지) */
export function redactDailyPulseForGuest(pulse: DailyPulseData): DailyPulseData {
  return {
    ...pulse,
    nationalComposite: PULSE_LOCKED,
    nationalChangePct: PULSE_LOCKED,
    interpretation: "로그인하면 전국·TOP 구 추이와 알림을 확인할 수 있습니다.",
    packingIndexDod: null,
    moveInIndexDod: null,
    packingRollingVolume: null,
    moveInRollingVolume: null,
    packingRollingBelowTen: true,
    moveInRollingBelowTen: true,
    indexSparklines: pulse.indexSparklines.map(lockSparkline),
    rollingSparklines: pulse.rollingSparklines.map(lockSparkline),
    alerts: [],
    topDistricts: pulse.topDistricts.map(lockTopDistrict),
  };
}

/** district 번들·시계열 제거 — 클라이언트 선로드 방지 */
export function stripDistrictFromKeywordStore(store: DemandKeywordStore | null): DemandKeywordStore | null {
  if (!store) return store;
  const byRegion: DemandKeywordStore["byRegion"] = {};
  for (const [key, bundle] of Object.entries(store.byRegion)) {
    if (!key.includes(":")) {
      byRegion[key] = bundle;
    }
  }
  return { byRegion };
}

export function stripDistrictFromRtmsSeries(series: DemandRtmsSeriesStore): DemandRtmsSeriesStore {
  const out: DemandRtmsSeriesStore = {};
  for (const [key, pts] of Object.entries(series)) {
    if (key.startsWith("national:") || key.startsWith("city:")) {
      out[key] = pts;
    }
  }
  return out;
}

export function stripDemandScoreContextForClient(ctx: DemandScoreContext | null): DemandScoreContext | null {
  if (!ctx) return ctx;
  return {
    ...ctx,
    keywordStore: stripDistrictFromKeywordStore(ctx.keywordStore ?? null),
    rtmsSeries: stripDistrictFromRtmsSeries(ctx.rtmsSeries ?? {}),
  };
}

/** 비관리자 SSR — 구·시 상세 데이터 제거 */
export function stripDemandHubBootstrapForClient(
  bootstrap: DemandHubBootstrap,
  tier: "guest" | "member" | "admin"
): DemandHubBootstrap {
  if (tier === "admin") return bootstrap;

  const keywordStore = stripDistrictFromKeywordStore(bootstrap.keywordStore) ?? { byRegion: {} };
  const rtmsSeries = stripDistrictFromRtmsSeries(bootstrap.rtmsSeries);
  const scoreContext = stripDemandScoreContextForClient(bootstrap.scoreContext)!;
  const dailyPulse = bootstrap.dailyPulse;

  return {
    rtmsSnapshot: {
      ...bootstrap.rtmsSnapshot,
      byRegionKey: {},
    },
    rtmsSeries,
    keywordStore,
    scoreContext,
    dailyPulse,
  };
}

/** API — grant 된 지역(+ 전국)만 keyword/rtms 포함 */
export function filterRegionScopePayload(
  payload: DemandRegionScopePayload,
  grantedRegionKeys: string[]
): DemandRegionScopePayload {
  const granted = new Set(grantedRegionKeys);
  const keywordStore: DemandKeywordStore = { byRegion: {} };
  const rtmsSeries: DemandRtmsSeriesStore = {};

  if (payload.keywordStore.byRegion.kr) {
    keywordStore.byRegion.kr = payload.keywordStore.byRegion.kr;
  }
  if (payload.rtmsSeries["national:kr"]) {
    rtmsSeries["national:kr"] = payload.rtmsSeries["national:kr"];
  }

  for (const key of granted) {
    if (key === "national") continue;
    if (key.startsWith("city:")) {
      const cityId = key.slice("city:".length);
      const bundle = payload.keywordStore.byRegion[cityId];
      if (bundle) keywordStore.byRegion[cityId] = bundle;
      const rtmsKey = `city:${cityId}`;
      if (payload.rtmsSeries[rtmsKey]) rtmsSeries[rtmsKey] = payload.rtmsSeries[rtmsKey];
    } else if (key.startsWith("district:")) {
      const rest = key.slice("district:".length);
      const bundle = payload.keywordStore.byRegion[rest];
      if (bundle) keywordStore.byRegion[rest] = bundle;
      const rtmsKey = `district:${rest}`;
      if (payload.rtmsSeries[rtmsKey]) rtmsSeries[rtmsKey] = payload.rtmsSeries[rtmsKey];
    }
  }

  return { keywordStore, rtmsSeries };
}

export function emptyRegionScopePayload(): DemandRegionScopePayload {
  return { keywordStore: { byRegion: {} }, rtmsSeries: {} };
}
