import type { SupabaseClient } from "@supabase/supabase-js";
import {
  syncDemandKeywordDailyFromNaverTrend,
  type DemandDatalabSyncFromTrendResult,
} from "@/lib/demand/datalab-sync-from-trend";
import { runDemandDatalabDailyIngestJob, type DemandDatalabIngestResult } from "@/lib/demand/datalab-ingest";
import {
  runDemandSearchAdMonthlyIngestJob,
  type DemandSearchAdMonthlyIngestResult,
} from "@/lib/demand/searchad-monthly-ingest";

export type DemandDatalabIngestOutcome = DemandDatalabIngestResult | DemandDatalabSyncFromTrendResult;

export type DemandKeywordIngestResult = {
  ok: boolean;
  datalab: DemandDatalabIngestOutcome;
  searchAd: DemandSearchAdMonthlyIngestResult;
};

/** 데이터랩·트렌드만 (일 1회). 검색량은 `runDemandSearchAdMonthlyIngestJob` / 월간 cron. */
export async function runDemandKeywordIngestJob(
  supabase: SupabaseClient
): Promise<DemandKeywordIngestResult> {
  let datalab: DemandDatalabIngestOutcome = await runDemandDatalabDailyIngestJob(supabase);

  if (!datalab.ok && "needsKey" in datalab && datalab.needsKey) {
    const synced = await syncDemandKeywordDailyFromNaverTrend(supabase);
    if (synced.ok) {
      datalab = {
        ...synced,
        warning:
          "구별 검색지수 없음 — NAVER_CLIENT_ID/SECRET 없어 마케팅 트렌드 DB의 전국 키워드만 복사했습니다. 구별(강남구입주청소·강남구포장이사 등)은 데이터랩 API 직접 수집이 필요합니다.",
      };
    }
  }

  const searchAd: DemandSearchAdMonthlyIngestResult = {
    ok: true,
    skipped: true,
    note: "검색광고는 매월 스냅샷 전용 — /api/cron/ingest-demand-searchad 또는 관리자 「검색광고만 수집」",
  };

  return { ok: datalab.ok, datalab, searchAd };
}

export { runDemandSearchAdMonthlyIngestJob };
