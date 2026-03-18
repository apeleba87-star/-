/**
 * 리포트 생성 시 스냅샷 자동 생성. buildDailyTenderReport 호출 후 실행.
 * 주간 시장 요약 등 구현된 타입만큼 report_snapshots에 upsert.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateWeeklyTenders } from "./tender-report-queries";
import { buildWeeklyMarketSummary } from "./build-weekly-market-summary";

export type BuildReportSnapshotsResult = {
  ok: true;
  created: string[];
  skipped: string[];
} | { ok: false; error: string };

/**
 * 현재 날짜 기준 주간 시장 요약 스냅샷 생성.
 * 동일 report_type + period_key 있으면 업데이트.
 */
export async function buildReportSnapshots(
  supabase: SupabaseClient,
  options: { runId?: string | null; date?: Date } = {}
): Promise<BuildReportSnapshotsResult> {
  const { runId = null, date } = options;
  const created: string[] = [];
  const skipped: string[] = [];

  try {
    const weekPayload = await aggregateWeeklyTenders(supabase, date);
    const weekSnapshot = buildWeeklyMarketSummary(weekPayload);

    if (weekSnapshot) {
      const { error } = await supabase.from("report_snapshots").upsert(
        {
          run_id: runId,
          report_type: weekSnapshot.report_type,
          period_key: weekSnapshot.period_key,
          title: weekSnapshot.title,
          content_full: weekSnapshot.content_full as unknown as Record<string, unknown>,
          content_summary: weekSnapshot.content_summary as unknown as Record<string, unknown>,
          content_social: weekSnapshot.content_social,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "report_type,period_key" }
      );
      if (error) {
        return { ok: false, error: `report_snapshots upsert failed: ${error.message}` };
      }
      created.push(`${weekSnapshot.report_type}:${weekSnapshot.period_key}`);
    } else {
      skipped.push("weekly_market_summary: no data");
    }

    return { ok: true, created, skipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
