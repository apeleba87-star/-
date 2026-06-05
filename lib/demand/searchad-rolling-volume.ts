import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import { demandPhraseBasketId } from "@/lib/demand/keyword-baskets";
import { ymdToChartDayPeriodLabel } from "@/lib/demand/copy";
import type { DemandKeywordChartPoint } from "@/lib/demand/keyword-hub-data";
import { demandKeywordRegionStoreKey } from "@/lib/demand/region-search-keywords";

export const SEARCHAD_ROLLING_30D_SOURCE = "searchad_rolling_30d";

export type SearchAdRollingRawRow = {
  keyword_key: string;
  region_scope: string;
  region_key: string;
  search_phrase: string | null;
  period_date: string;
  search_volume_rolling_30d: number | null;
  search_volume_below_ten: boolean;
};

export type RollingBasketSnapshot = {
  volume: number | null;
  belowTen: boolean;
  snapshotDate: string;
};

export type RollingBasketByRegion = Partial<
  Record<DemandKeywordKey, RollingBasketSnapshot>
>;

/** phrase별 롤링 행 → 지역·키워드 Basket 합 (최신 snapshot_date) */
export function aggregateRollingBasketByRegion(
  rows: SearchAdRollingRawRow[]
): Record<string, RollingBasketByRegion> {
  const byRegionDate = new Map<string, Map<string, SearchAdRollingRawRow[]>>();

  for (const row of rows) {
    const storeKey = demandKeywordRegionStoreKey({
      regionScope: row.region_scope as "national" | "city" | "district",
      regionKey: row.region_key,
    });
    const date = String(row.period_date).slice(0, 10);
    if (!byRegionDate.has(storeKey)) byRegionDate.set(storeKey, new Map());
    const byDate = byRegionDate.get(storeKey)!;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(row);
  }

  const out: Record<string, RollingBasketByRegion> = {};

  for (const [storeKey, byDate] of byRegionDate.entries()) {
    const latestDate = [...byDate.keys()].sort().at(-1);
    if (!latestDate) continue;
    const dayRows = byDate.get(latestDate) ?? [];

    const packing = sumBasketForKeyword(dayRows, "packing", latestDate);
    const moveIn = sumBasketForKeyword(dayRows, "move_in_clean", latestDate);
    if (!packing && !moveIn) continue;

    out[storeKey] = {};
    if (packing) out[storeKey].packing = packing;
    if (moveIn) out[storeKey].move_in_clean = moveIn;
  }

  return out;
}

function sumBasketForKeyword(
  rows: SearchAdRollingRawRow[],
  keywordKey: DemandKeywordKey,
  snapshotDate: string
): RollingBasketSnapshot | null {
  let sum = 0;
  let belowTenOnly = true;
  let matched = 0;

  for (const row of rows) {
    if (row.keyword_key !== keywordKey) continue;
    const phrase = (row.search_phrase ?? "").trim().replace(/\s+/g, "");
    const basketId = phrase ? demandPhraseBasketId(phrase) : null;
    if (keywordKey === "packing" && basketId !== "packing") continue;
    if (keywordKey === "move_in_clean" && basketId !== "move_in") continue;

    matched += 1;
    if (row.search_volume_below_ten) continue;
    const v = row.search_volume_rolling_30d;
    if (v != null && Number.isFinite(v) && v > 0) {
      sum += v;
      belowTenOnly = false;
    }
  }

  if (matched === 0) return null;

  return {
    volume: belowTenOnly ? null : sum,
    belowTen: belowTenOnly,
    snapshotDate,
  };
}

type RollingDayTotals = { packing: number; moveIn: number; packingBelowTen: boolean; moveInBelowTen: boolean };

/** phrase Basket 합 — 지역·일별 롤링 30일 검색량 (데일리 차트용) */
export function aggregateRollingVolumeDailySeries(
  rows: SearchAdRollingRawRow[],
  storeKey: string
): Record<DemandKeywordKey, DemandKeywordChartPoint[]> {
  const byDate = new Map<string, RollingDayTotals>();

  for (const row of rows) {
    const key = demandKeywordRegionStoreKey({
      regionScope: row.region_scope as "national" | "city" | "district",
      regionKey: row.region_key,
    });
    if (key !== storeKey) continue;

    const date = String(row.period_date).slice(0, 10);
    const kw = row.keyword_key as DemandKeywordKey;
    const phrase = (row.search_phrase ?? "").trim().replace(/\s+/g, "");
    const basketId = phrase ? demandPhraseBasketId(phrase) : null;
    if (kw === "packing" && basketId !== "packing") continue;
    if (kw === "move_in_clean" && basketId !== "move_in") continue;

    const cur = byDate.get(date) ?? {
      packing: 0,
      moveIn: 0,
      packingBelowTen: true,
      moveInBelowTen: true,
    };
    if (row.search_volume_below_ten) {
      /* keep belowTen flags */
    } else {
      const v = row.search_volume_rolling_30d;
      if (v != null && Number.isFinite(v) && v > 0) {
        if (kw === "packing") {
          cur.packing += v;
          cur.packingBelowTen = false;
        } else {
          cur.moveIn += v;
          cur.moveInBelowTen = false;
        }
      }
    }
    byDate.set(date, cur);
  }

  const sortedDates = [...byDate.keys()].sort();
  const packing: DemandKeywordChartPoint[] = [];
  const move_in_clean: DemandKeywordChartPoint[] = [];

  for (const date of sortedDates) {
    const t = byDate.get(date)!;
    if (!t.packingBelowTen && t.packing > 0) {
      packing.push({ period: ymdToChartDayPeriodLabel(date), value: t.packing });
    }
    if (!t.moveInBelowTen && t.moveIn > 0) {
      move_in_clean.push({ period: ymdToChartDayPeriodLabel(date), value: t.moveIn });
    }
  }

  return { packing, move_in_clean };
}
