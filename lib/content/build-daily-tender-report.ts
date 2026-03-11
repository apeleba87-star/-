/**
 * 일간 입찰 리포트: 집계 → 검증 → post + newsletter_queue.
 * force 시 기존 post 업데이트(정책 A), queue는 ref_id로 갱신.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateDailyTenders } from "./tender-report-queries";
import {
  buildDailyTitle,
  buildDailyBody,
  buildDailySlug,
  getDailySummaryText,
  SOURCE_TYPE_DAILY,
} from "./tender-report-templates";
import { validateDailyReport } from "./content-quality-guard";
import { getKstDateString } from "./kst-utils";
import { GENERATOR_VERSION } from "./content-generation-runs";

export type BuildDailyResult =
  | { ok: true; postId: string; runId: string; skipped: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; reason: string };

export async function buildDailyTenderReport(
  supabase: SupabaseClient,
  options: { date?: Date; force?: boolean } = {}
): Promise<BuildDailyResult> {
  const { date, force = false } = options;
  const runKey = getKstDateString(date);
  const startedAt = new Date().toISOString();

  const payload = await aggregateDailyTenders(supabase, date);
  if (payload.count_total === 0) {
    const { error: runErr } = await supabase
      .from("content_generation_runs")
      .upsert(
        {
          run_type: "daily_tender_digest",
          run_key: runKey,
          status: "skipped",
          source_count: 0,
          payload: { count_total: 0, date: runKey },
          attempt_count: 1,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          generator_version: GENERATOR_VERSION,
        },
      { onConflict: "run_type,run_key", ignoreDuplicates: false }
    );
    if (runErr) {
      return { ok: false, reason: `run insert failed: ${runErr.message}` };
    }
    return { ok: true, skipped: true, reason: "no_tenders" };
  }

  const title = buildDailyTitle(payload);
  const body = buildDailyBody(payload);
  const slug = buildDailySlug(runKey);
  const summary = getDailySummaryText(payload);

  const validation = validateDailyReport(payload, title, body, slug);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  const autoPublish = process.env.CONTENT_AUTO_PUBLISH === "true";
  const publishedAt = autoPublish ? new Date().toISOString() : null;

  const postPayload = {
    title,
    slug,
    body,
    excerpt: summary,
    newsletter_include: true,
    published_at: publishedAt,
    source_type: SOURCE_TYPE_DAILY,
    source_ref: runKey,
    updated_at: new Date().toISOString(),
  };

  let postId: string;

  if (force) {
    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("source_type", SOURCE_TYPE_DAILY)
      .eq("source_ref", runKey)
      .maybeSingle();
    if (existing?.id) {
      const { error: updateErr } = await supabase.from("posts").update(postPayload).eq("id", existing.id);
      if (updateErr) return { ok: false, reason: `post update failed: ${updateErr.message}` };
      postId = existing.id;
      const { error: queueErr } = await supabase
        .from("newsletter_queue")
        .update({ title, summary, content_html: null })
        .eq("ref_type", "post")
        .eq("ref_id", postId);
      if (queueErr) {
        await supabase.from("newsletter_queue").insert({
          type: "auto",
          ref_type: "post",
          ref_id: postId,
          title,
          summary,
          scheduled_for: runKey,
          sort_order: 0,
        });
      }
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("posts")
        .insert(postPayload)
        .select("id")
        .single();
      if (insertErr) return { ok: false, reason: `post insert failed: ${insertErr.message}` };
      postId = inserted.id;
      await supabase.from("newsletter_queue").insert({
        type: "auto",
        ref_type: "post",
        ref_id: postId,
        title,
        summary,
        scheduled_for: runKey,
        sort_order: 0,
      });
    }
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("posts")
      .insert(postPayload)
      .select("id")
      .single();
    if (insertErr) return { ok: false, reason: `post insert failed: ${insertErr.message}` };
    postId = inserted.id;
    await supabase.from("newsletter_queue").insert({
      type: "auto",
      ref_type: "post",
      ref_id: postId,
      title,
      summary,
      scheduled_for: runKey,
      sort_order: 0,
    });
  }

  const payloadForRun = {
    count_total: payload.count_total,
    budget_total: payload.budget_total,
    top_region: payload.region_breakdown[0]?.name ?? null,
    top_budget: payload.top_budget_tenders[0]?.budget ?? null,
    date_range: runKey,
  };

  const { data: existingRun } = await supabase
    .from("content_generation_runs")
    .select("attempt_count")
    .eq("run_type", "daily_tender_digest")
    .eq("run_key", runKey)
    .maybeSingle();

  const attemptCount = (existingRun?.attempt_count ?? 0) + 1;

  const { data: runRow, error: runErr } = await supabase
    .from("content_generation_runs")
    .upsert(
      {
        run_type: "daily_tender_digest",
        run_key: runKey,
        status: "success",
        source_count: payload.count_total,
        generated_post_id: postId,
        payload: payloadForRun,
        error_message: null,
        attempt_count: attemptCount,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        generator_version: GENERATOR_VERSION,
      },
      { onConflict: "run_type,run_key", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (runErr) {
    return { ok: false, reason: `run update failed: ${runErr.message}` };
  }

  return { ok: true, postId, runId: runRow.id, skipped: false };
}
