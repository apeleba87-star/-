import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";
import { DEMAND_RTMS_MONTHS_BACK_BACKFILL } from "@/lib/demand/rtms-ingest";

export type DemandRtmsBackfillBatch = {
  step: number;
  id: string;
  label: string;
  cityId?: string;
  districtCount: number;
  monthsBack: number;
  refreshNational: boolean;
  nationalRefreshOnly?: boolean;
  note?: string;
};

const CITY_BY_ID = new Map(DEMAND_REGION_REGISTRY.map((c) => [c.id, c]));

/** 서울 제외 · 구 수 적은 순 → 경기 마지막. 17번째는 전국 합산만. */
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
  "gyeonggi",
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

export const DEMAND_RTMS_BACKFILL_BATCHES: DemandRtmsBackfillBatch[] = [
  ...BACKFILL_CITY_ORDER.map((cityId, i) => cityBatch(cityId, i + 1)),
  {
    step: BACKFILL_CITY_ORDER.length + 1,
    id: "national-refresh",
    label: "전국 합산 갱신",
    districtCount: 0,
    monthsBack: DEMAND_RTMS_MONTHS_BACK_BACKFILL,
    refreshNational: false,
    nationalRefreshOnly: true,
    note: "16개 시·도 백필 후 1회 — RTMS API 없이 national 행만 시·도 합산",
  },
];

export const DEMAND_RTMS_BACKFILL_EXCLUDED = {
  cityId: "seoul",
  label: "서울특별시",
  districtCount: CITY_BY_ID.get("seoul")?.districts.length ?? 25,
  reason: "이미 백필 완료",
} as const;

export const DEMAND_RTMS_BACKFILL_CITY_STEP_COUNT = BACKFILL_CITY_ORDER.length;
