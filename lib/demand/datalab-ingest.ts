import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToDateString, getKstTodayString } from "@/lib/jobs/kst-date";
import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import {
  buildRegionSearchPhrases,
  listAllDistrictKeywordTargets,
  type DemandKeywordRegionRef,
} from "@/lib/demand/region-search-keywords";

export type DemandDatalabIngestOptions = {
  /** 미설정 시 전국 280곳(백필용·타임아웃 주의). 크론은 시·도 1곳 권장 */
  cityId?: string;
};
import { fetchNaverDatalabSearchTrend } from "@/lib/naver/datalab-client";

export type DemandDatalabIngestResult =
  | {
      ok: true;
      inserted: number;
      startDate: string;
      endDate: string;
      days: number;
      monthStartDate?: string;
      monthEndDate?: string;
      months?: number;
      regions: number;
      cityId?: string;
      districts?: number;
    }
  | { ok: false; error: string; needsKey?: boolean };

type DailyUpsertRow = {
  keyword_key: DemandKeywordKey;
  region_scope: string;
  region_key: string;
  search_phrase: string;
  period_date: string;
  index_ratio: number;
  source: string;
  updated_at: string;
};

type DatalabGroup = {
  groupName: string;
  keywords: string[];
  meta: DemandKeywordRegionRef & { keywordKey: DemandKeywordKey; searchPhrase: string };
};

function getDatalabDaysBack(): number {
  const v = Number(process.env.DEMAND_DATALAB_DAYS_BACK ?? 60);
  if (!Number.isFinite(v)) return 60;
  return Math.min(Math.max(Math.round(v), 14), 90);
}

function getDatalabMonthsBack(): number {
  const v = Number(process.env.DEMAND_DATALAB_MONTHS_BACK ?? 12);
  if (!Number.isFinite(v)) return 12;
  return Math.min(Math.max(Math.round(v), 6), 24);
}

function addMonthsToMonthStart(dateYmd: string, deltaMonths: number): string {
  const [y, m] = dateYmd.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function normalizePeriodDate(period: string): string {
  return period.slice(0, 10);
}

const DATALAB_UPSERT_CHUNK = 400;
const DATALAB_BATCH_DELAY_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertDemandKeywordDailyBatched(
  supabase: SupabaseClient,
  allRows: DailyUpsertRow[]
): Promise<{ inserted: number } | { error: string }> {
  let inserted = 0;
  for (let i = 0; i < allRows.length; i += DATALAB_UPSERT_CHUNK) {
    const chunk = allRows.slice(i, i + DATALAB_UPSERT_CHUNK);
    const { error, count } = await supabase.from("demand_keyword_daily").upsert(chunk, {
      onConflict: "keyword_key,region_scope,region_key,search_phrase,period_date,source",
      count: "exact",
    });
    if (error) return { error: error.message };
    inserted += count ?? chunk.length;
  }
  return { inserted };
}

function encodeGroupName(region: DemandKeywordRegionRef, keywordKey: DemandKeywordKey): string {
  return `d|${region.regionScope}|${region.regionKey}|${keywordKey}`;
}

function buildNationalGroups(): DatalabGroup[] {
  const nationalTargets: Array<{
    region: DemandKeywordRegionRef;
    keywordKey: DemandKeywordKey;
    phrase: string;
  }> = [
    {
      region: { regionScope: "national", regionKey: "kr" },
      keywordKey: "packing",
      phrase: "포장이사",
    },
    {
      region: { regionScope: "national", regionKey: "kr" },
      keywordKey: "move_in_clean",
      phrase: "입주청소",
    },
  ];
  return nationalTargets.map((t) => ({
    groupName: encodeGroupName(t.region, t.keywordKey),
    keywords: [t.phrase],
    meta: { ...t.region, keywordKey: t.keywordKey, searchPhrase: t.phrase },
  }));
}

function buildCityGroups(cityId: string): DatalabGroup[] {
  const phrases = buildRegionSearchPhrases({ scope: "city", cityId });
  if (!phrases) return [];

  return (["packing", "move_in_clean"] as const).map((keywordKey) => {
    const phrase = keywordKey === "packing" ? phrases.packing : phrases.moveInClean;
    const region: DemandKeywordRegionRef = { regionScope: "city", regionKey: cityId };
    return {
      groupName: encodeGroupName(region, keywordKey),
      keywords: [phrase],
      meta: { ...region, keywordKey, searchPhrase: phrase },
    };
  });
}

function buildDistrictGroups(keywordKey: DemandKeywordKey, cityId?: string): DatalabGroup[] {
  return listAllDistrictKeywordTargets(cityId).map((d) => {
    const phrase = keywordKey === "packing" ? d.phrases.packing : d.phrases.moveInClean;
    const region: DemandKeywordRegionRef = {
      regionScope: "district",
      regionKey: d.regionKey,
    };
    return {
      groupName: encodeGroupName(region, keywordKey),
      keywords: [phrase],
      meta: { ...region, keywordKey, searchPhrase: phrase },
    };
  });
}

async function fetchDatalabBatch(
  clientId: string,
  clientSecret: string,
  startDate: string,
  endDate: string,
  timeUnit: "date" | "month",
  source: string,
  groups: DatalabGroup[]
): Promise<DailyUpsertRow[]> {
  const res = await fetchNaverDatalabSearchTrend({
    startDate,
    endDate,
    timeUnit,
    keywordGroups: groups.map((g) => ({ groupName: g.groupName, keywords: g.keywords })),
    clientId,
    clientSecret,
  });

  const now = new Date().toISOString();
  const rows: DailyUpsertRow[] = [];
  const metaByName = new Map(groups.map((g) => [g.groupName, g.meta]));

  for (const result of res.results) {
    const meta = metaByName.get(result.title);
    if (!meta) continue;
    for (const point of result.data) {
      rows.push({
        keyword_key: meta.keywordKey,
        region_scope: meta.regionScope,
        region_key: meta.regionKey,
        search_phrase: meta.searchPhrase,
        period_date: normalizePeriodDate(point.period),
        index_ratio: Number(point.ratio) || 0,
        source,
        updated_at: now,
      });
    }
  }
  return rows;
}

async function collectAllRegionRows(
  clientId: string,
  clientSecret: string,
  startDate: string,
  endDate: string,
  timeUnit: "date" | "month",
  source: string,
  options?: DemandDatalabIngestOptions
): Promise<{ rows: DailyUpsertRow[]; regionBatches: number; districts: number }> {
  const allRows: DailyUpsertRow[] = [];
  let regionBatches = 0;
  const cityId = options?.cityId;
  const districtTargets = listAllDistrictKeywordTargets(cityId);

  const cityBatches: DatalabGroup[][] = cityId ? [buildCityGroups(cityId)] : [];

  const batches: DatalabGroup[][] = [
    buildNationalGroups(),
    ...cityBatches,
    ...(["packing", "move_in_clean"] as const).flatMap((keywordKey) => {
      const districts = buildDistrictGroups(keywordKey, cityId);
      const chunks: DatalabGroup[][] = [];
      for (let i = 0; i < districts.length; i += 5) {
        chunks.push(districts.slice(i, i + 5));
      }
      return chunks;
    }),
  ];

  for (let b = 0; b < batches.length; b++) {
    if (b > 0) await sleep(DATALAB_BATCH_DELAY_MS);
    const groups = batches[b];
    if (groups.length === 0) continue;
    allRows.push(
      ...(await fetchDatalabBatch(
        clientId,
        clientSecret,
        startDate,
        endDate,
        timeUnit,
        source,
        groups
      ))
    );
    regionBatches += 1;
  }

  return { rows: allRows, regionBatches, districts: districtTargets.length };
}

export async function runDemandDatalabDailyIngestJob(
  supabase: SupabaseClient,
  options?: DemandDatalabIngestOptions
): Promise<DemandDatalabIngestResult> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      needsKey: true,
      error: "NAVER_CLIENT_ID and NAVER_CLIENT_SECRET are required for DataLab ingest",
    };
  }

  const days = getDatalabDaysBack();
  const months = getDatalabMonthsBack();
  const todayKst = getKstTodayString();
  const endDate = addDaysToDateString(todayKst, -1);
  const startDate = addDaysToDateString(endDate, -(days - 1));
  const monthEndDate = endDate;
  const monthStartDate = addMonthsToMonthStart(monthEndDate, -(months - 1));

  try {
    const daily = await collectAllRegionRows(
      clientId,
      clientSecret,
      startDate,
      endDate,
      "date",
      "datalab",
      options
    );
    const monthly = await collectAllRegionRows(
      clientId,
      clientSecret,
      monthStartDate,
      monthEndDate,
      "month",
      "datalab_month",
      options
    );

    const allRows = [...daily.rows, ...monthly.rows];
    if (allRows.length === 0) {
      return { ok: false, error: "DataLab returned no rows" };
    }

    const upserted = await upsertDemandKeywordDailyBatched(supabase, allRows);
    if ("error" in upserted) {
      return { ok: false, error: upserted.error };
    }

    return {
      ok: true,
      inserted: upserted.inserted,
      startDate,
      endDate,
      days,
      monthStartDate,
      monthEndDate,
      months,
      regions: daily.regionBatches,
      cityId: options?.cityId,
      districts: daily.districts,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
