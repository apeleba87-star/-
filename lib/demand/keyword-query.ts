import {
  DEMAND_KEYWORD_KEYS,
  type DemandKeywordKey,
} from "@/lib/demand/keyword-keys";
import type { DemandKeywordRegionBundle, DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import { getDemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";
import { sumDailyIndexRowsByDate } from "@/lib/demand/basket-datalab-aggregate";
import { demandPhraseBasketId } from "@/lib/demand/keyword-baskets";
import { DEMAND_BASKET_DISPLAY_LABELS } from "@/lib/demand/copy";
import {
  bundleDemandKeywordFromRows,
  resolveDemandKeywordBundle,
} from "@/lib/demand/keyword-resolve";
import { demandKeywordRegionStoreKey } from "@/lib/demand/region-search-keywords";
import type { DemandKeywordRegionRef } from "@/lib/demand/region-search-keywords";
import { demandIsIncompleteSearchVolumeMonth } from "@/lib/demand/searchad-month-report";
import {
  aggregateRollingBasketByRegion,
  aggregateRollingVolumeDailySeries,
  SEARCHAD_ROLLING_30D_SOURCE,
  type SearchAdRollingRawRow,
  type RollingBasketByRegion,
} from "@/lib/demand/searchad-rolling-volume";
import { addDaysToDateString, getKstTodayString } from "@/lib/jobs/kst-date";
import { createClient } from "@/lib/supabase-server";

export type { DemandKeywordRegionBundle, DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
export { resolveDemandKeywordBundle } from "@/lib/demand/keyword-resolve";

type DemandKeywordDailyRow = {
  periodDate: string;
  indexRatio: number;
};

type VolumeMonthRow = {
  yyyymm: string;
  volume: number | null;
  belowTen: boolean;
};

type RawDaily = {
  keyword_key: string;
  region_scope: string;
  region_key: string;
  search_phrase: string | null;
  period_date: string;
  index_ratio: number;
  source: string;
  search_volume_rolling_30d?: number | null;
  search_volume_below_ten?: boolean;
};

type RawMonthly = {
  keyword_key: string;
  region_scope: string;
  region_key: string;
  search_phrase: string | null;
  search_volume_month: number | null;
  search_volume_below_ten: boolean;
  yyyymm: string;
};

const SEARCHAD_HISTORY_MONTHS = 12;
/** 1년 검색지수 차트 — datalab_month는 일간 조회창(40일) 밖에 있어도 로드 */
const DATALAB_MONTHLY_INDEX_LOOKBACK_MONTHS = 13;
const DATALAB_DAILY_SOURCES = new Set(["datalab", "naver_trend"]);
const DATALAB_MONTHLY_INDEX_SOURCE = "datalab_month";

function monthStartMonthsAgo(months: number): string {
  const [y, m] = getKstTodayString().split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 - (months - 1), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function dedupeKeywordDailyRows(rows: RawDaily[]): RawDaily[] {
  const byKey = new Map<string, RawDaily>();
  for (const row of rows) {
    const key = [
      row.region_scope,
      row.region_key,
      row.keyword_key,
      row.period_date,
      row.source,
      row.search_phrase ?? "",
    ].join("\0");
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

type VolumeMonthAccum = { sum: number; belowTenOnly: boolean };

function accumulateVolumeMonth(
  map: Map<string, VolumeMonthAccum>,
  yyyymm: string,
  volume: number | null,
  belowTen: boolean
): void {
  const add = belowTen || volume == null || !Number.isFinite(volume) ? 0 : volume;
  const cur = map.get(yyyymm) ?? { sum: 0, belowTenOnly: true };
  map.set(yyyymm, {
    sum: cur.sum + add,
    belowTenOnly: cur.belowTenOnly && add === 0,
  });
}

function volumeMapToRows(map: Map<string, VolumeMonthAccum>): VolumeMonthRow[] {
  return [...map.entries()]
    .filter(([yyyymm]) => !demandIsIncompleteSearchVolumeMonth(yyyymm))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yyyymm, { sum, belowTenOnly }]) => ({
      yyyymm,
      volume: belowTenOnly ? null : sum,
      belowTen: belowTenOnly,
    }));
}

function latestVolumeSnapshot(
  rows: VolumeMonthRow[]
): { volume: number | null; belowTen: boolean } | undefined {
  if (rows.length === 0) return undefined;
  const sorted = [...rows].sort((a, b) => a.yyyymm.localeCompare(b.yyyymm));
  const last = sorted[sorted.length - 1];
  return { volume: last.volume, belowTen: last.belowTen };
}

function volumeSnapshotForRegion(
  rolling: RollingBasketByRegion | undefined,
  volMonths: { packing: VolumeMonthRow[]; move_in_clean: VolumeMonthRow[] }
): {
  volume: Partial<Record<DemandKeywordKey, { volume: number | null; belowTen: boolean }>>;
  meta: { rollingSnapshotDate: string | null; fromRolling: boolean };
} {
  const packingRolling = rolling?.packing;
  const moveInRolling = rolling?.move_in_clean;
  const fromRolling = Boolean(packingRolling || moveInRolling);

  return {
    volume: {
      packing: packingRolling
        ? { volume: packingRolling.volume, belowTen: packingRolling.belowTen }
        : latestVolumeSnapshot(volMonths.packing),
      move_in_clean: moveInRolling
        ? { volume: moveInRolling.volume, belowTen: moveInRolling.belowTen }
        : latestVolumeSnapshot(volMonths.move_in_clean),
    },
    meta: {
      rollingSnapshotDate:
        packingRolling?.snapshotDate ?? moveInRolling?.snapshotDate ?? null,
      fromRolling,
    },
  };
}

type SupabaseReader = ReturnType<typeof createClient>;

async function fetchKeywordDailyRows(
  supabase: SupabaseReader,
  sinceDate: string,
  regionRefs?: DemandKeywordRegionRef[]
): Promise<RawDaily[] | null> {
  const dailySelectWithRolling =
    "keyword_key, region_scope, region_key, search_phrase, period_date, index_ratio, source, search_volume_rolling_30d, search_volume_below_ten";
  const dailySelectBase =
    "keyword_key, region_scope, region_key, search_phrase, period_date, index_ratio, source";

  async function queryFiltered(select: string, limit: number) {
    if (!regionRefs?.length) {
      return supabase
        .from("demand_keyword_daily")
        .select(select)
        .gte("period_date", sinceDate)
        .order("period_date", { ascending: true })
        .limit(limit);
    }

    const national = regionRefs.some((r) => r.regionScope === "national");
    const cityKeys = [...new Set(regionRefs.filter((r) => r.regionScope === "city").map((r) => r.regionKey))];
    const districtKeys = [
      ...new Set(regionRefs.filter((r) => r.regionScope === "district").map((r) => r.regionKey)),
    ];

    const queries = [];
    if (national) {
      queries.push(
        supabase
          .from("demand_keyword_daily")
          .select(select)
          .eq("region_scope", "national")
          .eq("region_key", "kr")
          .gte("period_date", sinceDate)
          .order("period_date", { ascending: true })
          .limit(limit)
      );
    }
    if (cityKeys.length) {
      queries.push(
        supabase
          .from("demand_keyword_daily")
          .select(select)
          .eq("region_scope", "city")
          .in("region_key", cityKeys)
          .gte("period_date", sinceDate)
          .order("period_date", { ascending: true })
          .limit(limit)
      );
    }
    if (districtKeys.length) {
      queries.push(
        supabase
          .from("demand_keyword_daily")
          .select(select)
          .eq("region_scope", "district")
          .in("region_key", districtKeys)
          .gte("period_date", sinceDate)
          .order("period_date", { ascending: true })
          .limit(limit)
      );
    }

    const results = await Promise.all(queries);
    const rows = results.flatMap((r) => (r.data ?? []) as unknown as RawDaily[]);
    return { data: rows, error: results.find((r) => r.error)?.error ?? null };
  }

  const dailyResInitial = await queryFiltered(dailySelectWithRolling, regionRefs?.length ? 6000 : 20000);
  let dailyRows = dailyResInitial.data as RawDaily[] | null;
  if (
    dailyResInitial.error &&
    /search_volume_rolling_30d|search_volume_below_ten/i.test(dailyResInitial.error.message)
  ) {
    const fallbackRes = await queryFiltered(dailySelectBase, regionRefs?.length ? 6000 : 20000);
    dailyRows = fallbackRes.data as RawDaily[] | null;
  }
  return dailyRows;
}

async function fetchKeywordMonthlyIndexRows(
  supabase: SupabaseReader,
  sinceMonthStart: string,
  regionRefs?: DemandKeywordRegionRef[]
): Promise<RawDaily[] | null> {
  const select =
    "keyword_key, region_scope, region_key, search_phrase, period_date, index_ratio, source";

  async function queryFiltered(limit: number) {
    if (!regionRefs?.length) {
      return supabase
        .from("demand_keyword_daily")
        .select(select)
        .eq("source", DATALAB_MONTHLY_INDEX_SOURCE)
        .gte("period_date", sinceMonthStart)
        .order("period_date", { ascending: true })
        .limit(limit);
    }

    const national = regionRefs.some((r) => r.regionScope === "national");
    const cityKeys = [...new Set(regionRefs.filter((r) => r.regionScope === "city").map((r) => r.regionKey))];
    const districtKeys = [
      ...new Set(regionRefs.filter((r) => r.regionScope === "district").map((r) => r.regionKey)),
    ];

    const queries = [];
    if (national) {
      queries.push(
        supabase
          .from("demand_keyword_daily")
          .select(select)
          .eq("region_scope", "national")
          .eq("region_key", "kr")
          .eq("source", DATALAB_MONTHLY_INDEX_SOURCE)
          .gte("period_date", sinceMonthStart)
          .order("period_date", { ascending: true })
          .limit(limit)
      );
    }
    if (cityKeys.length) {
      queries.push(
        supabase
          .from("demand_keyword_daily")
          .select(select)
          .eq("region_scope", "city")
          .in("region_key", cityKeys)
          .eq("source", DATALAB_MONTHLY_INDEX_SOURCE)
          .gte("period_date", sinceMonthStart)
          .order("period_date", { ascending: true })
          .limit(limit)
      );
    }
    if (districtKeys.length) {
      queries.push(
        supabase
          .from("demand_keyword_daily")
          .select(select)
          .eq("region_scope", "district")
          .in("region_key", districtKeys)
          .eq("source", DATALAB_MONTHLY_INDEX_SOURCE)
          .gte("period_date", sinceMonthStart)
          .order("period_date", { ascending: true })
          .limit(limit)
      );
    }

    const results = await Promise.all(queries);
    const rows = results.flatMap((r) => (r.data ?? []) as unknown as RawDaily[]);
    return { data: rows, error: results.find((r) => r.error)?.error ?? null };
  }

  const res = await queryFiltered(regionRefs?.length ? 3000 : 12000);
  if (res.error) return null;
  return res.data as RawDaily[];
}

async function fetchKeywordMonthlyRows(
  supabase: SupabaseReader,
  volumeSinceYyyymm: string,
  regionRefs?: DemandKeywordRegionRef[]
) {
  const select =
    "keyword_key, region_scope, region_key, search_phrase, yyyymm, search_volume_month, search_volume_below_ten, source";

  if (!regionRefs?.length) {
    return supabase
      .from("demand_keyword_monthly")
      .select(select)
      .gte("yyyymm", volumeSinceYyyymm)
      .order("yyyymm", { ascending: true })
      .limit(8000);
  }

  const national = regionRefs.some((r) => r.regionScope === "national");
  const cityKeys = [...new Set(regionRefs.filter((r) => r.regionScope === "city").map((r) => r.regionKey))];
  const districtKeys = [
    ...new Set(regionRefs.filter((r) => r.regionScope === "district").map((r) => r.regionKey)),
  ];

  const queries = [];
  if (national) {
    queries.push(
      supabase
        .from("demand_keyword_monthly")
        .select(select)
        .eq("region_scope", "national")
        .eq("region_key", "kr")
        .gte("yyyymm", volumeSinceYyyymm)
        .order("yyyymm", { ascending: true })
        .limit(2000)
    );
  }
  if (cityKeys.length) {
    queries.push(
      supabase
        .from("demand_keyword_monthly")
        .select(select)
        .eq("region_scope", "city")
        .in("region_key", cityKeys)
        .gte("yyyymm", volumeSinceYyyymm)
        .order("yyyymm", { ascending: true })
        .limit(2000)
    );
  }
  if (districtKeys.length) {
    queries.push(
      supabase
        .from("demand_keyword_monthly")
        .select(select)
        .eq("region_scope", "district")
        .in("region_key", districtKeys)
        .gte("yyyymm", volumeSinceYyyymm)
        .order("yyyymm", { ascending: true })
        .limit(4000)
    );
  }

  const results = await Promise.all(queries);
  return {
    data: results.flatMap((r) => r.data ?? []),
    error: results.find((r) => r.error)?.error ?? null,
  };
}

function assembleDemandKeywordStore(
  dailyRows: RawDaily[] | null,
  monthlyRows: RawMonthly[] | null,
  fallbackBundle: Awaited<ReturnType<typeof getDemandNationalKeywordMetrics>>
): DemandKeywordStore {
  const byRegion: Record<string, DemandKeywordRegionBundle> = {};
  const dailyGrouped: Record<string, Record<DemandKeywordKey, DemandKeywordDailyRow[]>> = {};
  const monthlyGrouped: Record<string, Record<DemandKeywordKey, DemandKeywordDailyRow[]>> = {};
  const volumeMonthlyGrouped: Record<
    string,
    Record<DemandKeywordKey, Map<string, VolumeMonthAccum>>
  > = {};
  const handFreeVolumeGrouped: Record<string, Record<string, Map<string, VolumeMonthAccum>>> = {};
  const rollingRawRows: SearchAdRollingRawRow[] = [];
  const rollingSince = addDaysToDateString(getKstTodayString(), -14);

  if (dailyRows) {
    for (const row of dailyRows) {
      const k = demandKeywordRegionStoreKey({
        regionScope: row.region_scope as "national" | "city" | "district",
        regionKey: row.region_key,
      });
      const kw = row.keyword_key as DemandKeywordKey;
      if (!DEMAND_KEYWORD_KEYS.includes(kw)) continue;

      if (row.source === SEARCHAD_ROLLING_30D_SOURCE) {
        const date = String(row.period_date).slice(0, 10);
        if (date >= rollingSince) {
          rollingRawRows.push({
            keyword_key: row.keyword_key,
            region_scope: row.region_scope,
            region_key: row.region_key,
            search_phrase: row.search_phrase,
            period_date: date,
            search_volume_rolling_30d: row.search_volume_rolling_30d ?? null,
            search_volume_below_ten: Boolean(row.search_volume_below_ten),
          });
        }
        continue;
      }

      const phraseCompact = (row.search_phrase ?? "").trim().replace(/\s+/g, "");
      const phraseBasket = phraseCompact ? demandPhraseBasketId(phraseCompact) : null;
      if (kw === "packing" && phraseBasket !== "packing") continue;
      if (kw === "move_in_clean" && phraseBasket !== "move_in") continue;
      const isMonthly = row.source === "datalab_month";
      const bucket = isMonthly ? monthlyGrouped : dailyGrouped;
      if (!bucket[k]) bucket[k] = { packing: [], move_in_clean: [] };
      if (!isMonthly && !DATALAB_DAILY_SOURCES.has(row.source)) continue;
      bucket[k][kw].push({
        periodDate: String(row.period_date).slice(0, 10),
        indexRatio: Number(row.index_ratio ?? 0),
      });
    }
  }

  if (monthlyRows) {
    for (const row of monthlyRows) {
      const k = demandKeywordRegionStoreKey({
        regionScope: row.region_scope as "national" | "city" | "district",
        regionKey: row.region_key,
      });
      const kw = row.keyword_key as DemandKeywordKey;
      if (!DEMAND_KEYWORD_KEYS.includes(kw)) continue;
      const phraseCompact = (row.search_phrase ?? "").trim().replace(/\s+/g, "");
      const basketId = phraseCompact ? demandPhraseBasketId(phraseCompact) : null;
      if (kw === "packing" && basketId !== "packing") continue;
      if (kw === "move_in_clean" && basketId !== "move_in" && basketId !== "hand_free") continue;
      if (basketId === "hand_free") {
        if (!handFreeVolumeGrouped[k]) handFreeVolumeGrouped[k] = {};
        if (!handFreeVolumeGrouped[k][phraseCompact]) {
          handFreeVolumeGrouped[k][phraseCompact] = new Map();
        }
        accumulateVolumeMonth(
          handFreeVolumeGrouped[k][phraseCompact],
          row.yyyymm,
          row.search_volume_month != null ? Number(row.search_volume_month) : null,
          Boolean(row.search_volume_below_ten)
        );
        continue;
      }
      if (!volumeMonthlyGrouped[k]) {
        volumeMonthlyGrouped[k] = {
          packing: new Map(),
          move_in_clean: new Map(),
        };
      }
      accumulateVolumeMonth(
        volumeMonthlyGrouped[k][kw],
        row.yyyymm,
        row.search_volume_month != null ? Number(row.search_volume_month) : null,
        Boolean(row.search_volume_below_ten)
      );
    }
  }

  for (const storeKey of Object.keys(dailyGrouped)) {
    for (const kw of DEMAND_KEYWORD_KEYS) {
      dailyGrouped[storeKey][kw] = sumDailyIndexRowsByDate(dailyGrouped[storeKey][kw] ?? []);
    }
  }
  for (const storeKey of Object.keys(monthlyGrouped)) {
    for (const kw of DEMAND_KEYWORD_KEYS) {
      monthlyGrouped[storeKey][kw] = sumDailyIndexRowsByDate(monthlyGrouped[storeKey][kw] ?? []);
    }
  }

  const rollingByRegion = aggregateRollingBasketByRegion(rollingRawRows);

  for (const storeKey of new Set([
    ...Object.keys(dailyGrouped),
    ...Object.keys(monthlyGrouped),
    ...Object.keys(volumeMonthlyGrouped),
    ...Object.keys(handFreeVolumeGrouped),
    ...Object.keys(rollingByRegion),
  ])) {
    const phrases = {
      packing: DEMAND_BASKET_DISPLAY_LABELS.packing,
      moveInClean: DEMAND_BASKET_DISPLAY_LABELS.moveIn,
    };
    const volMaps = volumeMonthlyGrouped[storeKey] ?? {
      packing: new Map(),
      move_in_clean: new Map(),
    };
    const volMonths = {
      packing: volumeMapToRows(volMaps.packing),
      move_in_clean: volumeMapToRows(volMaps.move_in_clean),
    };
    const handFreeByPhrase: Record<string, VolumeMonthRow[]> = {};
    for (const [phrase, map] of Object.entries(handFreeVolumeGrouped[storeKey] ?? {})) {
      handFreeByPhrase[phrase] = volumeMapToRows(map);
    }
    const { volume, meta } = volumeSnapshotForRegion(rollingByRegion[storeKey], volMonths);

    byRegion[storeKey] = bundleDemandKeywordFromRows(
      phrases,
      dailyGrouped[storeKey] ?? { packing: [], move_in_clean: [] },
      monthlyGrouped[storeKey] ?? { packing: [], move_in_clean: [] },
      volume,
      volMonths,
      fallbackBundle,
      handFreeByPhrase,
      meta
    );
    const rollingDaily = aggregateRollingVolumeDailySeries(rollingRawRows, storeKey);
    if (rollingDaily.packing.length > 0 || rollingDaily.move_in_clean.length > 0) {
      byRegion[storeKey].rollingVolumeDailySeries = rollingDaily;
    }
  }

  return { byRegion };
}

export type DemandKeywordLoadOptions = {
  /** 일간 키워드 조회 기간(일). 기본 400 */
  dailySinceDays?: number;
};

async function loadDemandKeywordStore(
  regionRefs?: DemandKeywordRegionRef[],
  options?: DemandKeywordLoadOptions
): Promise<DemandKeywordStore> {
  const fallbackBundle = await getDemandNationalKeywordMetrics();
  try {
    const supabase = createClient();
    const sinceDate = addDaysToDateString(
      getKstTodayString(),
      -(options?.dailySinceDays ?? 400)
    );
    const volumeSinceYyyymm = addDaysToDateString(getKstTodayString(), -SEARCHAD_HISTORY_MONTHS * 31).slice(
      0,
      7
    );

    const monthlyIndexSince = monthStartMonthsAgo(DATALAB_MONTHLY_INDEX_LOOKBACK_MONTHS);

    const [dailyRows, monthlyIndexRows, monthlyRes] = await Promise.all([
      fetchKeywordDailyRows(supabase, sinceDate, regionRefs),
      fetchKeywordMonthlyIndexRows(supabase, monthlyIndexSince, regionRefs),
      fetchKeywordMonthlyRows(supabase, volumeSinceYyyymm, regionRefs),
    ]);

    const mergedDailyRows = dedupeKeywordDailyRows([
      ...(dailyRows ?? []),
      ...(monthlyIndexRows ?? []),
    ]);

    return assembleDemandKeywordStore(
      mergedDailyRows.length > 0 ? mergedDailyRows : null,
      (monthlyRes.data ?? null) as RawMonthly[] | null,
      fallbackBundle
    );
  } catch {
    return { byRegion: {} };
  }
}

export async function getDemandKeywordStoreForRegions(
  regionRefs: DemandKeywordRegionRef[],
  options?: DemandKeywordLoadOptions
): Promise<DemandKeywordStore> {
  return loadDemandKeywordStore(regionRefs, options);
}

export async function getDemandKeywordStore(): Promise<DemandKeywordStore> {
  return loadDemandKeywordStore();
}

/** @deprecated resolveDemandKeywordBundle + getDemandKeywordStore 사용 */
export async function getDemandKeywordHubData(): Promise<DemandKeywordRegionBundle> {
  const store = await getDemandKeywordStore();
  const fallback = await getDemandNationalKeywordMetrics();
  return resolveDemandKeywordBundle(store, { scope: "national" }, fallback);
}
