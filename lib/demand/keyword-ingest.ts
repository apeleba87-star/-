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

export async function runDemandKeywordIngestJob(
  supabase: SupabaseClient
): Promise<DemandKeywordIngestResult> {
  let datalab: DemandDatalabIngestOutcome = await runDemandDatalabDailyIngestJob(supabase);

  if (!datalab.ok && datalab.needsKey) {
    const synced = await syncDemandKeywordDailyFromNaverTrend(supabase);
    if (synced.ok) {
      datalab = synced;
    }
  }

  const searchAd = await runDemandSearchAdMonthlyIngestJob(supabase);
  const ok = datalab.ok && (searchAd.ok || searchAd.skipped === true);
  return { ok, datalab, searchAd };
}
