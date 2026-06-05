/** RTMS DB 스냅샷·시계열 타입 (클라이언트 공유용, supabase import 없음) */

export type DemandRtmsMonthlyPoint = {
  yyyymm: string;
  saleCount: number;
  jeonseCount: number;
};

/** `region_scope:region_key` → 월별 시계열 (오름차순) */
export type DemandRtmsSeriesStore = Record<string, DemandRtmsMonthlyPoint[]>;

export type DemandRtmsDistrictSnapshot = {
  bySlug: Record<
    string,
    {
      saleCount: number;
      jeonseCount: number;
      saleMom: number;
      jeonseMom: number;
    }
  >;
  baseMonthLabel: string | null;
  baseYyyymm: string | null;
};
