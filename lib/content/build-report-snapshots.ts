/**
 * 리포트 생성 시 스냅샷 자동 생성. buildDailyTenderReport 호출 후 실행.
 * 주간 시장 요약, 마감 임박, 준비기간 짧은 공고, 대형 공고 TOP, 개찰 예정 등 report_snapshots에 upsert.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateWeeklyTenders,
  aggregateDeadlineSoonTenders,
  aggregatePrepShortTenders,
  aggregateLargeTenderTop,
  aggregateOpeningScheduledTenders,
} from "./tender-report-queries";
import { buildWeeklyMarketSummary } from "./build-weekly-market-summary";
import {
  buildDeadlineSoonSnapshot,
  buildPrepShortSnapshot,
  buildLargeTenderTopSnapshot,
  buildOpeningScheduledSnapshot,
} from "./build-other-report-snapshots";
import { aggregateListingMarketIntel } from "./listing-report-queries";
import { buildListingMarketIntelSnapshot } from "./build-listing-market-intel";

export type BuildReportSnapshotsResult = {
  ok: true;
  created: string[];
  skipped: string[];
} | { ok: false; error: string };

async function upsertSnapshot(
  supabase: SupabaseClient,
  runId: string | null,
  snapshot: { report_type: string; period_key: string; title: string; content_full: unknown; content_summary: unknown; content_social: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("report_snapshots").upsert(
    {
      run_id: runId,
      report_type: snapshot.report_type,
      period_key: snapshot.period_key,
      title: snapshot.title,
      content_full: snapshot.content_full as Record<string, unknown>,
      content_summary: snapshot.content_summary as Record<string, unknown>,
      content_social: snapshot.content_social,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "report_type,period_key" }
  );
  return { error: error ? error.message : null };
}

/**
 * 현재 날짜 기준 여러 리포트 타입 스냅샷 생성. 동일 report_type + period_key 있으면 업데이트.
 */
export async function buildReportSnapshots(
  supabase: SupabaseClient,
  options: { runId?: string | null; date?: Date } = {}
): Promise<BuildReportSnapshotsResult> {
  const { runId = null, date } = options;
  const created: string[] = [];
  const skipped: string[] = [];

  try {
    const runDate = date ?? new Date();

    // 1. 주간 시장 요약
    const weekPayload = await aggregateWeeklyTenders(supabase, runDate);
    const weekSnapshot = buildWeeklyMarketSummary(weekPayload);
    if (weekSnapshot) {
      const { error } = await upsertSnapshot(supabase, runId, weekSnapshot);
      if (error) return { ok: false, error: `report_snapshots upsert failed: ${error}` };
      created.push(`${weekSnapshot.report_type}:${weekSnapshot.period_key}`);
    } else {
      skipped.push("weekly_market_summary: no data");
    }

    // 2. 마감 임박
    const deadlinePayload = await aggregateDeadlineSoonTenders(supabase, runDate);
    const deadlineSnapshot = buildDeadlineSoonSnapshot(deadlinePayload);
    if (deadlineSnapshot) {
      const { error } = await upsertSnapshot(supabase, runId, deadlineSnapshot);
      if (error) return { ok: false, error: `report_snapshots upsert failed: ${error}` };
      created.push(`${deadlineSnapshot.report_type}:${deadlineSnapshot.period_key}`);
    } else {
      skipped.push("deadline_soon: no data");
    }

    // 3. 준비기간 짧은 공고
    const prepPayload = await aggregatePrepShortTenders(supabase, runDate);
    const prepSnapshot = buildPrepShortSnapshot(prepPayload);
    if (prepSnapshot) {
      const { error } = await upsertSnapshot(supabase, runId, prepSnapshot);
      if (error) return { ok: false, error: `report_snapshots upsert failed: ${error}` };
      created.push(`${prepSnapshot.report_type}:${prepSnapshot.period_key}`);
    } else {
      skipped.push("prep_short: no data");
    }

    // 4. 대형 공고 TOP
    const largePayload = await aggregateLargeTenderTop(supabase, runDate);
    const largeSnapshot = buildLargeTenderTopSnapshot(largePayload);
    if (largeSnapshot) {
      const { error } = await upsertSnapshot(supabase, runId, largeSnapshot);
      if (error) return { ok: false, error: `report_snapshots upsert failed: ${error}` };
      created.push(`${largeSnapshot.report_type}:${largeSnapshot.period_key}`);
    } else {
      skipped.push("large_tender_top: no data");
    }

    // 5. 개찰 예정
    const openingPayload = await aggregateOpeningScheduledTenders(supabase, runDate);
    const openingSnapshot = buildOpeningScheduledSnapshot(openingPayload);
    if (openingSnapshot) {
      const { error } = await upsertSnapshot(supabase, runId, openingSnapshot);
      if (error) return { ok: false, error: `report_snapshots upsert failed: ${error}` };
      created.push(`${openingSnapshot.report_type}:${openingSnapshot.period_key}`);
    } else {
      skipped.push("opening_scheduled: no data");
    }

    // 6. 현장거래 시장 인텔리전스
    const listingPayload = await aggregateListingMarketIntel(supabase, runDate);
    const listingSnapshot = buildListingMarketIntelSnapshot(listingPayload);
    if (listingSnapshot) {
      const { error } = await upsertSnapshot(supabase, runId, listingSnapshot);
      if (error) return { ok: false, error: `report_snapshots upsert failed: ${error}` };
      created.push(`${listingSnapshot.report_type}:${listingSnapshot.period_key}`);
    } else {
      skipped.push("listing_market_intel: no data");
    }

    return { ok: true, created, skipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
