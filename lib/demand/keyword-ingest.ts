import type { SupabaseClient } from "@supabase/supabase-js";
import {
  syncDemandKeywordDailyFromNaverTrend,
  type DemandDatalabSyncFromTrendResult,
} from "@/lib/demand/datalab-sync-from-trend";
import { runDemandDatalabDailyIngestJob, type DemandDatalabIngestResult } from "@/lib/demand/datalab-ingest";
import {
  runDemandSearchAdDailyIngestJob,
  type DemandSearchAdDailyIngestResult,
} from "@/lib/demand/searchad-daily-ingest";
import {
  runDemandSearchAdMonthlyIngestJob,
  type DemandSearchAdMonthlyIngestResult,
} from "@/lib/demand/searchad-monthly-ingest";

export type DemandDatalabIngestOutcome = DemandDatalabIngestResult | DemandDatalabSyncFromTrendResult;

export type DemandKeywordIngestResult = {
  ok: boolean;
  datalab: DemandDatalabIngestOutcome;
  searchAdDaily: DemandSearchAdDailyIngestResult;
  searchAdMonthly: DemandSearchAdMonthlyIngestResult;
};

/** 일 1회 — 데이터랩(검색지수) + 검색광고 롤링 30일. 월별 아카이브는 별도 cron. */
export async function runDemandKeywordIngestJob(
  supabase: SupabaseClient
): Promise<DemandKeywordIngestResult> {
  const searchAdDaily = await runDemandSearchAdDailyIngestJob(supabase);

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

  const searchAdMonthly: DemandSearchAdMonthlyIngestResult = {
    ok: true,
    skipped: true,
    note: "월별 아카이브는 /api/cron/ingest-demand-searchad (매월 1회)",
  };

  return {
    ok: datalab.ok && searchAdDaily.ok,
    datalab,
    searchAdDaily,
    searchAdMonthly,
  };
}

export { runDemandSearchAdDailyIngestJob, runDemandSearchAdMonthlyIngestJob };
