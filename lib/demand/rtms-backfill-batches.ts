import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";
import { DEMAND_RTMS_MONTHS_BACK_BACKFILL } from "@/lib/demand/rtms-ingest";

export type DemandRtmsBackfillBatch = {
  step: number;
  id: string;
  label: string;
  cityId?: string;
  /** cityId 내 일부 구만 수집 (경기 1/2·2/2) */
  districtSlugs?: string[];
  districtCount: number;
  monthsBack: number;
  refreshNational: boolean;
  nationalRefreshOnly?: boolean;
  note?: string;
};

const CITY_BY_ID = new Map(DEMAND_REGION_REGISTRY.map((c) => [c.id, c]));

/** 서울·경기 제외 · 구 수 적은 순. 경기는 2단계로 분할. */
const BACKFILL_CITY_ORDER = [
  "sejong",
  "jeju",
  "gwangju",
  "daejeon",
  "ulsan",
  "daegu",
  "incheon",
  "busan",
  "chungbuk",
  "jeonbuk",
  "gangwon",
  "chungnam",
  "jeonnam",
  "gyeongnam",
  "gyeongbuk",
] as const;

function cityBatch(cityId: string, step: number): DemandRtmsBackfillBatch {
  const city = CITY_BY_ID.get(cityId);
  return {
    step,
    id: `city:${cityId}`,
    label: city?.fullLabel ?? cityId,
    cityId,
    districtCount: city?.districts.length ?? 0,
    monthsBack: DEMAND_RTMS_MONTHS_BACK_BACKFILL,
    refreshNational: false,
  };
}

function gyeonggiSplitBatch(
  step: number,
  districtSlugs: string[],
  partLabel: string
): DemandRtmsBackfillBatch {
  const city = CITY_BY_ID.get("gyeonggi");
  return {
    step,
    id: `city:gyeonggi:${partLabel.replace("/", "-")}`,
    label: `${city?.fullLabel ?? "경기도"} (${partLabel})`,
    cityId: "gyeonggi",
    districtSlugs,
    districtCount: districtSlugs.length,
    monthsBack: DEMAND_RTMS_MONTHS_BACK_BACKFILL,
    refreshNational: false,
    note: "46구 — API 부하 분산용 2단계",
  };
}

const gyeonggiSlugs = CITY_BY_ID.get("gyeonggi")?.districts.map((d) => d.slug) ?? [];
const gyeonggiMid = Math.ceil(gyeonggiSlugs.length / 2);

const cityBatches = BACKFILL_CITY_ORDER.map((cityId, i) => cityBatch(cityId, i + 1));
const gyeonggiBatches = [
  gyeonggiSplitBatch(cityBatches.length + 1, gyeonggiSlugs.slice(0, gyeonggiMid), "1/2"),
  gyeonggiSplitBatch(cityBatches.length + 2, gyeonggiSlugs.slice(gyeonggiMid), "2/2"),
];

export const DEMAND_RTMS_BACKFILL_BATCHES: DemandRtmsBackfillBatch[] = [
  ...cityBatches,
  ...gyeonggiBatches,
  {
    step: cityBatches.length + gyeonggiBatches.length + 1,
    id: "national-refresh",
    label: "전국 합산 갱신",
    districtCount: 0,
    monthsBack: DEMAND_RTMS_MONTHS_BACK_BACKFILL,
    refreshNational: false,
    nationalRefreshOnly: true,
    note: "시·도 백필 후 1회 — RTMS API 없이 national 행만 시·도 합산",
  },
];

export const DEMAND_RTMS_BACKFILL_EXCLUDED = {
  cityId: "seoul",
  label: "서울특별시",
  districtCount: CITY_BY_ID.get("seoul")?.districts.length ?? 25,
  reason: "이미 백필 완료",
} as const;

export const DEMAND_RTMS_BACKFILL_CITY_STEP_COUNT = DEMAND_RTMS_BACKFILL_BATCHES.filter(
  (b) => b.cityId && !b.nationalRefreshOnly
).length;
