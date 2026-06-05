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

function rtmsSeriesCutoffYyyymm(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - RTMS_SERIES_MONTHS_BACK);
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
    const { data, error } = await supabase
      .from("demand_rtms_monthly")
      .select("region_scope, region_key, yyyymm, sale_count, jeonse_count")
      .eq("region_scope", "district")
      .order("yyyymm", { ascending: false })
      .limit(5000);

    if (error || !data || data.length === 0) {
      return { byRegionKey: {}, baseMonthLabel: null, baseYyyymm: null };
    }

    const months = [...new Set(data.map((r) => String(r.yyyymm)))].sort().reverse();
    const current = months[0];
    const previous = months[1] ?? null;
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
export async function getDemandRtmsSeriesForKeys(keys: string[]): Promise<DemandRtmsSeriesStore> {
  if (keys.length === 0) return {};

  const parsed = keys.map(parseRtmsSeriesKey).filter((p): p is NonNullable<typeof p> => p != null);
  if (parsed.length === 0) return {};

  try {
    const supabase = createClient();
    const cutoff = rtmsSeriesCutoffYyyymm();
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
