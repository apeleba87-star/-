import type { SupabaseClient } from "@supabase/supabase-js";
import { SEARCHAD_ROLLING_30D_SOURCE } from "@/lib/demand/searchad-rolling-volume";
import { buildSearchAdHubIngestTargets } from "@/lib/demand/searchad-ingest-targets";
import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import {
  fetchSearchAdKeywordVolumes,
  getSearchAdCredentials,
} from "@/lib/naver/searchad-keyword-client";

export type DemandSearchAdDailyIngestResult =
  | {
      ok: true;
      inserted: number;
      snapshotDate: string;
      regions: number;
      phrases: number;
      mode: "rolling_30d";
    }
  | { ok: true; skipped: true; note: string }
  | { ok: false; error: string; needsKey?: boolean; skipped?: boolean };

type DailyUpsertRow = {
  keyword_key: DemandKeywordKey;
  region_scope: string;
  region_key: string;
  search_phrase: string;
  period_date: string;
  index_ratio: number;
  search_volume_rolling_30d: number | null;
  search_volume_below_ten: boolean;
  source: string;
  updated_at: string;
};

/**
 * 검색광고 롤링 30일 — KST 당일 1행/phrase (허브: 전국 Basket + 서울 시).
 * 카드·30일 검색량 차트 총량 + 데이터랩 지수 곡선 연동용.
 */
export async function runDemandSearchAdDailyIngestJob(
  supabase: SupabaseClient
): Promise<DemandSearchAdDailyIngestResult> {
  if (!getSearchAdCredentials()) {
    return {
      ok: false,
      needsKey: true,
      skipped: true,
      error:
        "검색광고 API 키 없음 — NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID",
    };
  }

  const snapshotDate = getKstTodayString();
  const now = new Date().toISOString();
  const targets = buildSearchAdHubIngestTargets();

  if (targets.length === 0) {
    return { ok: false, error: "수집 대상이 없습니다." };
  }

  try {
    const phrases = [...new Set(targets.map((t) => t.phrase))];
    const volumes = await fetchSearchAdKeywordVolumes(phrases);

    const rows: DailyUpsertRow[] = [];
    for (const t of targets) {
      const vol = volumes.get(t.phrase);
      rows.push({
        keyword_key: t.keywordKey,
        region_scope: t.region.regionScope,
        region_key: t.region.regionKey,
        search_phrase: t.phrase,
        period_date: snapshotDate,
        index_ratio: 0,
        search_volume_rolling_30d: vol?.total ?? null,
        search_volume_below_ten: vol?.belowTen ?? false,
        source: SEARCHAD_ROLLING_30D_SOURCE,
        updated_at: now,
      });
    }

    const { error, count } = await supabase.from("demand_keyword_daily").upsert(rows, {
      onConflict: "keyword_key,region_scope,region_key,period_date,source",
      count: "exact",
    });

    if (error) {
      const msg = error.message;
      if (/search_volume_rolling_30d|search_volume_below_ten/i.test(msg)) {
        return {
          ok: false,
          error: `${msg} — Supabase에 migration 154_demand_keyword_daily_rolling_volume.sql 을 적용하세요.`,
        };
      }
      return { ok: false, error: msg };
    }

    const regionKeys = new Set(targets.map((t) => `${t.region.regionScope}:${t.region.regionKey}`));

    return {
      ok: true,
      inserted: count ?? rows.length,
      snapshotDate,
      regions: regionKeys.size,
      phrases: phrases.length,
      mode: "rolling_30d",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
