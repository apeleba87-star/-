import type {
  DemandRtmsDistrictSnapshot,
  DemandRtmsSeriesStore,
} from "@/lib/demand/rtms-types";
import { resolveDistrictByRegionKey } from "@/lib/demand/slugs";
import { createClient } from "@/lib/supabase-server";

export type { DemandRtmsDistrictSnapshot, DemandRtmsMonthlyPoint, DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";

function demandRtmsSeriesKey(regionScope: string, regionKey: string): string {
  return `${regionScope}:${regionKey}`;
}

function toMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  return `${Number(y)}년 ${Number(m)}월`;
}

const RTMS_SERIES_MONTHS_BACK = 48;

function rtmsSeriesCutoffYyyymm(monthsBack = RTMS_SERIES_MONTHS_BACK): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function momPercent(curr: number, prev: number): number {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/** legacy bare slug (gangnam-gu) → seoul:gangnam-gu */
function normalizeDistrictRegionKey(raw: string): string {
  if (raw.includes(":")) return raw;
  const resolved = resolveDistrictByRegionKey(`seoul:${raw}`);
  if (resolved) return `seoul:${raw}`;
  return raw;
}

/**
 * demand_rtms_monthly 최신 2개월을 읽어 시군구별 count + MoM 계산.
 * region_key: `{cityId}:{slug}` (legacy 서울 bare slug 호환)
 */
export async function getDemandRtmsDistrictSnapshot(): Promise<DemandRtmsDistrictSnapshot> {
  try {
    const supabase = createClient();
    const { data: monthProbe, error: monthError } = await supabase
      .from("demand_rtms_monthly")
      .select("yyyymm")
      .eq("region_scope", "district")
      .order("yyyymm", { ascending: false })
      .limit(64);

    if (monthError || !monthProbe?.length) {
      return { byRegionKey: {}, baseMonthLabel: null, baseYyyymm: null };
    }

    const months = [...new Set(monthProbe.map((r) => String(r.yyyymm)))].sort().reverse();
    const current = months[0]!;
    const previous = months[1] ?? null;
    const monthFilter = previous ? [current, previous] : [current];

    const { data, error } = await supabase
      .from("demand_rtms_monthly")
      .select("region_scope, region_key, yyyymm, sale_count, jeonse_count")
      .eq("region_scope", "district")
      .in("yyyymm", monthFilter);

    if (error || !data || data.length === 0) {
      return { byRegionKey: {}, baseMonthLabel: null, baseYyyymm: null };
    }
    const byRegionKey: DemandRtmsDistrictSnapshot["byRegionKey"] = {};

    const currRows = data.filter((r) => String(r.yyyymm) === current);
    const prevRows = previous ? data.filter((r) => String(r.yyyymm) === previous) : [];
    const prevMap = new Map(
      prevRows.map((r) => {
        const key = normalizeDistrictRegionKey(String(r.region_key));
        return [
          key,
          {
            sale: Number(r.sale_count ?? 0),
            jeonse: Number(r.jeonse_count ?? 0),
          },
        ] as const;
      })
    );

    for (const row of currRows) {
      const regionKey = normalizeDistrictRegionKey(String(row.region_key));
      const saleCount = Number(row.sale_count ?? 0);
      const jeonseCount = Number(row.jeonse_count ?? 0);
      const prev = prevMap.get(regionKey);
      byRegionKey[regionKey] = {
        saleCount,
        jeonseCount,
        saleMom: momPercent(saleCount, prev?.sale ?? 0),
        jeonseMom: momPercent(jeonseCount, prev?.jeonse ?? 0),
      };
    }

    return {
      byRegionKey,
      baseMonthLabel: current ? toMonthLabel(current) : null,
      baseYyyymm: current ?? null,
    };
  } catch {
    return { byRegionKey: {}, baseMonthLabel: null, baseYyyymm: null };
  }
}

/**
 * demand_rtms_monthly 전체 스코프 월별 시계열 (차트 12·24개월용).
 */
export async function getDemandRtmsMonthlySeries(): Promise<DemandRtmsSeriesStore> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("demand_rtms_monthly")
      .select("region_scope, region_key, yyyymm, sale_count, jeonse_count")
      .gte("yyyymm", rtmsSeriesCutoffYyyymm())
      .order("yyyymm", { ascending: true });

    if (error || !data?.length) return {};

    const store: DemandRtmsSeriesStore = {};
    for (const row of data) {
      let regionKey = String(row.region_key);
      if (row.region_scope === "district") {
        regionKey = normalizeDistrictRegionKey(regionKey);
      }
      const key = demandRtmsSeriesKey(String(row.region_scope), regionKey);
      if (!store[key]) store[key] = [];
      store[key].push({
        yyyymm: String(row.yyyymm),
        saleCount: Number(row.sale_count ?? 0),
        jeonseCount: Number(row.jeonse_count ?? 0),
      });
    }
    return store;
  } catch {
    return {};
  }
}

function parseRtmsSeriesKey(key: string): { regionScope: string; regionKey: string } | null {
  if (key.startsWith("national:")) {
    return { regionScope: "national", regionKey: key.slice("national:".length) };
  }
  if (key.startsWith("city:")) {
    return { regionScope: "city", regionKey: key.slice("city:".length) };
  }
  if (key.startsWith("district:")) {
    return { regionScope: "district", regionKey: key.slice("district:".length) };
  }
  return null;
}

function rowsToRtmsSeriesStore(data: Array<Record<string, unknown>>): DemandRtmsSeriesStore {
  const store: DemandRtmsSeriesStore = {};
  for (const row of data) {
    let regionKey = String(row.region_key);
    if (row.region_scope === "district") {
      regionKey = normalizeDistrictRegionKey(regionKey);
    }
    const key = demandRtmsSeriesKey(String(row.region_scope), regionKey);
    if (!store[key]) store[key] = [];
    store[key].push({
      yyyymm: String(row.yyyymm),
      saleCount: Number(row.sale_count ?? 0),
      jeonseCount: Number(row.jeonse_count ?? 0),
    });
  }
  return store;
}

/** 지정 region 키만 RTMS 월별 시계열 (lazy load·허브 bootstrap) */
export async function getDemandRtmsSeriesForKeys(
  keys: string[],
  options?: { monthsBack?: number }
): Promise<DemandRtmsSeriesStore> {
  if (keys.length === 0) return {};

  const parsed = keys.map(parseRtmsSeriesKey).filter((p): p is NonNullable<typeof p> => p != null);
  if (parsed.length === 0) return {};

  try {
    const supabase = createClient();
    const cutoff = rtmsSeriesCutoffYyyymm(options?.monthsBack ?? RTMS_SERIES_MONTHS_BACK);
    const select = "region_scope, region_key, yyyymm, sale_count, jeonse_count";

    const nationalKeys = [...new Set(parsed.filter((p) => p.regionScope === "national").map((p) => p.regionKey))];
    const cityKeys = [...new Set(parsed.filter((p) => p.regionScope === "city").map((p) => p.regionKey))];
    const districtKeys = [...new Set(parsed.filter((p) => p.regionScope === "district").map((p) => p.regionKey))];

    const queries = [];
    if (nationalKeys.length) {
      queries.push(
        supabase
          .from("demand_rtms_monthly")
          .select(select)
          .eq("region_scope", "national")
          .in("region_key", nationalKeys)
          .gte("yyyymm", cutoff)
          .order("yyyymm", { ascending: true })
      );
    }
    if (cityKeys.length) {
      queries.push(
        supabase
          .from("demand_rtms_monthly")
          .select(select)
          .eq("region_scope", "city")
          .in("region_key", cityKeys)
          .gte("yyyymm", cutoff)
          .order("yyyymm", { ascending: true })
      );
    }
    if (districtKeys.length) {
      queries.push(
        supabase
          .from("demand_rtms_monthly")
          .select(select)
          .eq("region_scope", "district")
          .in("region_key", districtKeys)
          .gte("yyyymm", cutoff)
          .order("yyyymm", { ascending: true })
      );
    }

    const results = await Promise.all(queries);
    const rows = results.flatMap((r) => r.data ?? []);
    if (!rows.length) return {};
    return rowsToRtmsSeriesStore(rows);
  } catch {
    return {};
  }
}

function rtmsDistrictActivity(saleCount: number, jeonseCount: number): number {
  return jeonseCount * 0.7 + saleCount * 0.3;
}

function medianPositive(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function medianMapFromRows(rows: Array<{ yyyymm: string; median_activity: number }>): Record<string, number> {
  const medians: Record<string, number> = {};
  for (const row of rows) {
    const med = Number(row.median_activity);
    if (Number.isFinite(med) && med > 0) {
      medians[row.yyyymm] = med;
    }
  }
  return medians;
}

async function fetchDistrictMedianViaRpc(
  supabase: ReturnType<typeof createClient>,
  cutoff: string
): Promise<Record<string, number> | null> {
  const { data, error } = await supabase.rpc("demand_rtms_district_median_by_yyyymm", {
    cutoff_yyyymm: cutoff,
  });
  if (error || !data?.length) return null;
  return medianMapFromRows(
    data as Array<{ yyyymm: string; median_activity: number }>
  );
}

async function fetchDistrictMedianViaPagination(
  supabase: ReturnType<typeof createClient>,
  cutoff: string
): Promise<Record<string, number>> {
  const byYm = new Map<string, number[]>();
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("demand_rtms_monthly")
      .select("yyyymm, sale_count, jeonse_count")
      .eq("region_scope", "district")
      .gte("yyyymm", cutoff)
      .order("yyyymm", { ascending: true })
      .range(from, from + page - 1);
    if (error || !data?.length) break;
    for (const row of data) {
      const ym = String(row.yyyymm);
      const act = rtmsDistrictActivity(
        Number(row.sale_count ?? 0),
        Number(row.jeonse_count ?? 0)
      );
      if (!byYm.has(ym)) byYm.set(ym, []);
      byYm.get(ym)!.push(act);
    }
    if (data.length < page) break;
    from += page;
  }
  const medians: Record<string, number> = {};
  for (const [ym, acts] of byYm) {
    const med = medianPositive(acts);
    if (med > 0) medians[ym] = med;
  }
  return medians;
}

/** 전국 시군구 RTMS 활동량 — 신호월별 중앙값 (카드·그래프 공통) */
export async function getDemandRtmsDistrictMedianByYyyymm(
  options?: { monthsBack?: number }
): Promise<Record<string, number>> {
  try {
    const supabase = createClient();
    const cutoff = rtmsSeriesCutoffYyyymm(options?.monthsBack ?? RTMS_SERIES_MONTHS_BACK);
    const fromRpc = await fetchDistrictMedianViaRpc(supabase, cutoff);
    if (fromRpc) return fromRpc;
    return await fetchDistrictMedianViaPagination(supabase, cutoff);
  } catch {
    return {};
  }
}
