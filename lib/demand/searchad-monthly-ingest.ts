import type { SupabaseClient } from "@supabase/supabase-js";
import { demandSearchAdSnapshotYyyymm } from "@/lib/demand/searchad-month-report";
import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import { buildSearchAdArchiveIngestTargets } from "@/lib/demand/searchad-ingest-targets";
import {
  fetchSearchAdKeywordVolumes,
  getSearchAdCredentials,
} from "@/lib/naver/searchad-keyword-client";

export type DemandSearchAdMonthlyIngestResult =
  | {
      ok: true;
      inserted: number;
      yyyymm: string;
      regions: number;
      phrases: number;
      /** 이번 달 행 upsert — 이전 yyyymm 행은 유지(1년 누적) */
      mode: "monthly_snapshot";
    }
  | { ok: true; skipped: true; note: string }
  | { ok: false; error: string; needsKey?: boolean; skipped?: boolean };

type MonthlyUpsertRow = {
  keyword_key: DemandKeywordKey;
  region_scope: string;
  region_key: string;
  search_phrase: string;
  yyyymm: string;
  search_volume_month: number | null;
  search_volume_below_ten: boolean;
  index_mom_percent: number;
  source: string;
  updated_at: string;
};

function snapshotYyyymmKst(): string {
  /** API는 「최근 30일」만 제공 — KST 직전 확정 달에 귀속 (6월 초 수집 → 2026-05) */
  return demandSearchAdSnapshotYyyymm();
}

export type DemandSearchAdMonthlyIngestOptions = { cityId?: string };

export async function runDemandSearchAdMonthlyIngestJob(
  supabase: SupabaseClient,
  options?: DemandSearchAdMonthlyIngestOptions
): Promise<DemandSearchAdMonthlyIngestResult> {
  if (!getSearchAdCredentials()) {
    return {
      ok: false,
      needsKey: true,
      skipped: true,
      error:
        "검색광고 API 키 없음 — .env에 NAVER_SEARCHAD_API_KEY(액세스 라이선스), NAVER_SEARCHAD_SECRET_KEY(비밀키), NAVER_SEARCHAD_CUSTOMER_ID(고객 ID) 설정",
    };
  }

  /**
   * KST `yyyy-mm` 1행/지역·키워드. 같은 달 재수집 시 해당 월만 갱신, 과거 월은 삭제하지 않음.
   * 매월 cron 12회 ≈ 1년 검색량 차트.
   */
  const yyyymm = snapshotYyyymmKst();
  const now = new Date().toISOString();
  const targets = buildSearchAdArchiveIngestTargets(options?.cityId);

  if (targets.length === 0) {
    return { ok: false, error: "수집 대상 지역이 없습니다." };
  }

  try {
    const phrases = [...new Set(targets.map((t) => t.phrase))];
    const volumes = await fetchSearchAdKeywordVolumes(phrases);

    const rows: MonthlyUpsertRow[] = [];
    for (const t of targets) {
      const { data: existing } = await supabase
        .from("demand_keyword_monthly")
        .select("source")
        .eq("keyword_key", t.keywordKey)
        .eq("region_scope", t.region.regionScope)
        .eq("region_key", t.region.regionKey)
        .eq("search_phrase", t.phrase)
        .eq("yyyymm", yyyymm)
        .maybeSingle();

      if (existing?.source === "searchad_console") continue;

      const vol = volumes.get(t.phrase);
      rows.push({
        keyword_key: t.keywordKey,
        region_scope: t.region.regionScope,
        region_key: t.region.regionKey,
        search_phrase: t.phrase,
        yyyymm,
        search_volume_month: vol?.total ?? null,
        search_volume_below_ten: vol?.belowTen ?? false,
        index_mom_percent: 0,
        source: "searchad",
        updated_at: now,
      });
    }

    if (rows.length === 0) {
      return {
        ok: true,
        inserted: 0,
        yyyymm,
        regions: 0,
        phrases: phrases.length,
        mode: "monthly_snapshot",
      };
    }

    const regionKeys = new Set(targets.map((t) => `${t.region.regionScope}:${t.region.regionKey}`));

    const { error, count } = await supabase.from("demand_keyword_monthly").upsert(rows, {
      onConflict: "keyword_key,region_scope,region_key,search_phrase,yyyymm",
      count: "exact",
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      inserted: count ?? rows.length,
      yyyymm,
      regions: regionKeys.size,
      phrases: phrases.length,
      mode: "monthly_snapshot",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
