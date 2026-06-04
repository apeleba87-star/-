import {
  DEMAND_KEYWORD_KEYS,
  type DemandKeywordKey,
} from "@/lib/demand/keyword-keys";
import type { DemandKeywordRegionBundle, DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import { getDemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";
import {
  bundleDemandKeywordFromRows,
  resolveDemandKeywordBundle,
} from "@/lib/demand/keyword-resolve";
import { demandKeywordRegionStoreKey } from "@/lib/demand/region-search-keywords";
import { addDaysToDateString, getKstTodayString } from "@/lib/jobs/kst-date";
import { createServiceSupabase } from "@/lib/supabase-server";

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
const DATALAB_DAILY_SOURCES = new Set(["datalab", "naver_trend"]);

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

export async function getDemandKeywordStore(): Promise<DemandKeywordStore> {
  const fallbackBundle = await getDemandNationalKeywordMetrics();
  const byRegion: Record<string, DemandKeywordRegionBundle> = {};

  const dailyGrouped: Record<string, Record<DemandKeywordKey, DemandKeywordDailyRow[]>> = {};
  const monthlyGrouped: Record<string, Record<DemandKeywordKey, DemandKeywordDailyRow[]>> = {};
  const volumeMonthlyGrouped: Record<
    string,
    Record<DemandKeywordKey, Map<string, VolumeMonthAccum>>
  > = {};
  const phrasesByRegion: Record<string, { packing: string; moveInClean: string }> = {};

  try {
    const supabase = createServiceSupabase();
    const sinceDate = addDaysToDateString(getKstTodayString(), -400);
    const volumeSinceYyyymm = addDaysToDateString(getKstTodayString(), -SEARCHAD_HISTORY_MONTHS * 31).slice(
      0,
      7
    );

    const [dailyRes, monthlyRes] = await Promise.all([
      supabase
        .from("demand_keyword_daily")
        .select(
          "keyword_key, region_scope, region_key, search_phrase, period_date, index_ratio, source"
        )
        .gte("period_date", sinceDate)
        .order("period_date", { ascending: true })
        .limit(20000),
      supabase
        .from("demand_keyword_monthly")
        .select(
          "keyword_key, region_scope, region_key, search_phrase, yyyymm, search_volume_month, search_volume_below_ten"
        )
        .gte("yyyymm", volumeSinceYyyymm)
        .order("yyyymm", { ascending: true })
        .limit(8000),
    ]);

    if (dailyRes.data) {
      for (const row of dailyRes.data as RawDaily[]) {
        const k = demandKeywordRegionStoreKey({
          regionScope: row.region_scope as "national" | "city" | "district",
          regionKey: row.region_key,
        });
        const kw = row.keyword_key as DemandKeywordKey;
        if (!DEMAND_KEYWORD_KEYS.includes(kw)) continue;
        const isMonthly = row.source === "datalab_month";
        const bucket = isMonthly ? monthlyGrouped : dailyGrouped;
        if (!bucket[k]) bucket[k] = { packing: [], move_in_clean: [] };
        if (!isMonthly && !DATALAB_DAILY_SOURCES.has(row.source)) continue;
        bucket[k][kw].push({
          periodDate: String(row.period_date).slice(0, 10),
          indexRatio: Number(row.index_ratio ?? 0),
        });
        if (row.search_phrase) {
          if (!phrasesByRegion[k]) {
            phrasesByRegion[k] = { packing: "", moveInClean: "" };
          }
          if (kw === "packing") phrasesByRegion[k].packing = row.search_phrase;
          if (kw === "move_in_clean") phrasesByRegion[k].moveInClean = row.search_phrase;
        }
      }
    }

    if (monthlyRes.data) {
      for (const row of monthlyRes.data as RawMonthly[]) {
        const k = demandKeywordRegionStoreKey({
          regionScope: row.region_scope as "national" | "city" | "district",
          regionKey: row.region_key,
        });
        const kw = row.keyword_key as DemandKeywordKey;
        if (!DEMAND_KEYWORD_KEYS.includes(kw)) continue;
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
        if (row.search_phrase) {
          if (!phrasesByRegion[k]) {
            phrasesByRegion[k] = { packing: "", moveInClean: "" };
          }
          if (kw === "packing" && !phrasesByRegion[k].packing) {
            phrasesByRegion[k].packing = row.search_phrase;
          }
          if (kw === "move_in_clean" && !phrasesByRegion[k].moveInClean) {
            phrasesByRegion[k].moveInClean = row.search_phrase;
          }
        }
      }
    }

    for (const storeKey of new Set([
      ...Object.keys(dailyGrouped),
      ...Object.keys(monthlyGrouped),
      ...Object.keys(volumeMonthlyGrouped),
    ])) {
      const phrases = phrasesByRegion[storeKey] ?? {
        packing: "포장이사",
        moveInClean: "입주청소",
      };
      const volMaps = volumeMonthlyGrouped[storeKey] ?? {
        packing: new Map(),
        move_in_clean: new Map(),
      };
      const volMonths = {
        packing: volumeMapToRows(volMaps.packing),
        move_in_clean: volumeMapToRows(volMaps.move_in_clean),
      };
      byRegion[storeKey] = bundleDemandKeywordFromRows(
        phrases,
        dailyGrouped[storeKey] ?? { packing: [], move_in_clean: [] },
        monthlyGrouped[storeKey] ?? { packing: [], move_in_clean: [] },
        {
          packing: latestVolumeSnapshot(volMonths.packing),
          move_in_clean: latestVolumeSnapshot(volMonths.move_in_clean),
        },
        volMonths,
        fallbackBundle
      );
    }
  } catch {
    /* empty store */
  }

  return { byRegion };
}

/** @deprecated resolveDemandKeywordBundle + getDemandKeywordStore 사용 */
export async function getDemandKeywordHubData(): Promise<DemandKeywordRegionBundle> {
  const store = await getDemandKeywordStore();
  const fallback = await getDemandNationalKeywordMetrics();
  return resolveDemandKeywordBundle(store, { scope: "national" }, fallback);
}
