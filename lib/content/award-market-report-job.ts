/**
 * 낙찰 시장 리포트 생성·스냅샷·posts upsert (관리자 수동 / Vercel Cron 공용)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { GENERATOR_VERSION } from "@/lib/content/content-generation-runs";
import { buildAwardMarketSnapshot, computeAwardDailyCardHeadline } from "@/lib/content/build-award-market-snapshot";
import { extractIndustryMatchesFromNoticeTitle } from "@/lib/g2b/industry-from-raw";
import { REPORT_TYPE_AWARD_MARKET_INTEL } from "@/lib/content/report-snapshot-types";
import { reportContentToMarkdown } from "@/lib/content/snapshot-to-post-body";

export const AWARD_MARKET_RUN_TYPE = "award_market_digest";
const KST = "Asia/Seoul";

export function kstDateKeyForAwardReport(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export type AwardMarketReportJobResult =
  | { ok: true; skipped: true; reason: string; run_key?: string; message?: string }
  | {
      ok: true;
      skipped: false;
      run_key: string;
      report_type: string;
      period_key: string;
      post_id: string | null;
      message: string;
    }
  | { ok: false; error: string; run_key?: string };

/** 업종 매핑 없을 때 기존 스냅샷·글의 일자별 카드 헤드라인만 갱신 */
export async function refreshAwardReportDailyCard(
  supabase: SupabaseClient,
  periodKey: string,
): Promise<{ ok: true; card_headline: string; daily_award_count: number } | { ok: false; error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodKey)) {
    return { ok: false, error: "invalid period_key" };
  }

  const at = new Date(`${periodKey}T15:00:00+09:00`);
  const since = new Date(at.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: rowsError } = await supabase
    .from("tender_award_summaries")
    .select("openg_dt,bid_rate_pct,prtcpt_cnum")
    .gte("openg_dt", since);

  if (rowsError) return { ok: false, error: rowsError.message };

  const { card_headline, daily_award_count } = computeAwardDailyCardHeadline(rows ?? [], periodKey);

  const { data: existingPost, error: postError } = await supabase
    .from("posts")
    .select("id,report_snapshot")
    .eq("source_type", REPORT_TYPE_AWARD_MARKET_INTEL)
    .eq("source_ref", periodKey)
    .maybeSingle();

  if (postError) return { ok: false, error: postError.message };
  if (!existingPost?.id) return { ok: false, error: "post not found" };

  const snapshot = (existingPost.report_snapshot ?? {}) as Record<string, unknown>;
  const mergedSnapshot = {
    ...snapshot,
    card_headline,
    daily_award_count,
  };

  const { error: updatePostError } = await supabase
    .from("posts")
    .update({
      excerpt: card_headline,
      report_snapshot: mergedSnapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingPost.id);

  if (updatePostError) return { ok: false, error: updatePostError.message };

  const { data: snapRow } = await supabase
    .from("report_snapshots")
    .select("content_full,content_summary")
    .eq("report_type", REPORT_TYPE_AWARD_MARKET_INTEL)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (snapRow) {
    const full = { ...((snapRow.content_full ?? {}) as Record<string, unknown>), card_headline, daily_award_count };
    const summary = {
      ...((snapRow.content_summary ?? {}) as Record<string, unknown>),
      card_headline,
      daily_award_count,
    };
    await supabase
      .from("report_snapshots")
      .update({
        content_full: full,
        content_summary: summary,
        updated_at: new Date().toISOString(),
      })
      .eq("report_type", REPORT_TYPE_AWARD_MARKET_INTEL)
      .eq("period_key", periodKey);
  }

  return { ok: true, card_headline, daily_award_count };
}

export async function runAwardMarketReportJob(
  supabase: SupabaseClient,
  options: { force: boolean; autoPublish: boolean; at?: Date },
): Promise<AwardMarketReportJobResult> {
  const at = options.at ?? new Date();
  const runKey = `award:${kstDateKeyForAwardReport(at)}`;

  const { data: existingRun } = await supabase
    .from("content_generation_runs")
    .select("id, status, attempt_count")
    .eq("run_type", AWARD_MARKET_RUN_TYPE)
    .eq("run_key", runKey)
    .maybeSingle();

  if (existingRun?.status === "success" && !options.force) {
    return {
      ok: true,
      skipped: true,
      reason: "already_success",
      run_key: runKey,
      message: "오늘 회차 낙찰 리포트는 이미 생성되었습니다.",
    };
  }

  const attemptCount = (existingRun?.attempt_count ?? 0) + 1;
  const upsertRun = await supabase
    .from("content_generation_runs")
    .upsert(
      {
        run_type: AWARD_MARKET_RUN_TYPE,
        run_key: runKey,
        status: "pending",
        started_at: new Date().toISOString(),
        attempt_count: attemptCount,
        generator_version: GENERATOR_VERSION,
      },
      { onConflict: "run_type,run_key", ignoreDuplicates: false },
    )
    .select("id")
    .single();
  const runId = upsertRun.data?.id ?? existingRun?.id ?? null;

  const since = new Date(at.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: rowsError } = await supabase
    .from("tender_award_summaries")
    .select("tender_id,bid_ntce_nm,openg_dt,bid_rate_pct,prtcpt_cnum,sucsfbid_amt,presmpt_prce,rate_band")
    .gte("openg_dt", since)
    .order("openg_dt", { ascending: false })
    .limit(12000);

  if (rowsError) {
    await supabase
      .from("content_generation_runs")
      .update({ status: "failed", error_message: rowsError.message, finished_at: new Date().toISOString() })
      .eq("run_type", AWARD_MARKET_RUN_TYPE)
      .eq("run_key", runKey);
    return { ok: false, error: rowsError.message, run_key: runKey };
  }

  const tenderIds = [...new Set((rows ?? []).map((r) => r.tender_id).filter((v): v is string => typeof v === "string" && v.length > 0))];
  const [{ data: tRows }, { data: tiRows }, { data: industryRows }] = await Promise.all([
    tenderIds.length
      ? supabase
          .from("tenders")
          .select("id,region_sido_list,ntce_instt_nm,base_amt,primary_industry_code")
          .in("id", tenderIds)
      : Promise.resolve({ data: [] as unknown[] }),
    tenderIds.length
      ? supabase.from("tender_industries").select("tender_id,industry_code").in("tender_id", tenderIds)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase.from("industries").select("code,name,aliases,group_key,sort_order,is_active").eq("is_active", true),
  ]);

  type TenderRow = {
    id: string;
    region_sido_list: string[] | null;
    ntce_instt_nm: string | null;
    base_amt: number | null;
    primary_industry_code: string | null;
  };

  const tendersById = new Map(((tRows ?? []) as TenderRow[]).map((t) => [t.id, t]));
  const industryNameByCode = new Map(((industryRows ?? []) as { code: string; name: string }[]).map((i) => [i.code, i.name]));
  const industryRowsForTitle = (industryRows ?? []) as {
    code: string;
    name: string;
    aliases?: string[] | null;
    group_key?: string | null;
    sort_order?: number;
  }[];
  const industryCodesByTender = new Map<string, string[]>();
  for (const row of (tiRows ?? []) as { tender_id: string; industry_code: string }[]) {
    const list = industryCodesByTender.get(row.tender_id) ?? [];
    if (!list.includes(row.industry_code)) list.push(row.industry_code);
    industryCodesByTender.set(row.tender_id, list);
  }

  const enrichedRows = (rows ?? []).map((r) => {
    const tender = r.tender_id ? tendersById.get(r.tender_id) : undefined;
    let codes = r.tender_id ? (industryCodesByTender.get(r.tender_id) ?? []) : [];
    const primary = tender?.primary_industry_code?.trim();
    if (codes.length === 0 && primary && industryNameByCode.has(primary)) {
      codes = [primary];
    }
    let pickedCode = codes.find((c) => industryNameByCode.has(c)) ?? codes[0] ?? null;
    let industryName = pickedCode ? (industryNameByCode.get(pickedCode) ?? pickedCode) : null;
    if (!pickedCode) {
      const titleMatch = extractIndustryMatchesFromNoticeTitle(r.bid_ntce_nm, industryRowsForTitle);
      const m = titleMatch.matches[0];
      if (m && industryNameByCode.has(m.code)) {
        pickedCode = m.code;
        industryName = industryNameByCode.get(m.code) ?? m.code;
      }
    }
    const region =
      Array.isArray(tender?.region_sido_list) && tender!.region_sido_list.length > 0 ? tender!.region_sido_list[0]! : null;
    return {
      ...r,
      industry_code: pickedCode,
      industry_name: industryName,
      region_sido: region,
      agency_name: tender?.ntce_instt_nm ?? null,
      base_amt: tender?.base_amt ?? null,
    };
  });

  const snapshot = buildAwardMarketSnapshot(enrichedRows as Parameters<typeof buildAwardMarketSnapshot>[0], at);
  if (!snapshot) {
    await supabase
      .from("content_generation_runs")
      .update({
        status: "skipped",
        source_count: 0,
        error_message: null,
        finished_at: new Date().toISOString(),
      })
      .eq("run_type", AWARD_MARKET_RUN_TYPE)
      .eq("run_key", runKey);
    return { ok: true, skipped: true, reason: "no_awards", run_key: runKey, message: "집계할 낙찰 데이터가 없습니다." };
  }

  const { error: upsertSnapshotError } = await supabase.from("report_snapshots").upsert(
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
    { onConflict: "report_type,period_key" },
  );

  if (upsertSnapshotError) {
    await supabase
      .from("content_generation_runs")
      .update({
        status: "failed",
        source_count: snapshot.sample_count,
        error_message: upsertSnapshotError.message,
        finished_at: new Date().toISOString(),
      })
      .eq("run_type", AWARD_MARKET_RUN_TYPE)
      .eq("run_key", runKey);
    return { ok: false, error: upsertSnapshotError.message, run_key: runKey };
  }

  const postSlug = `report-${snapshot.report_type.replace(/_/g, "-")}-${snapshot.period_key.replace(/\s/g, "-")}`;
  const summary = snapshot.content_summary as Record<string, unknown>;
  const full = snapshot.content_full as Record<string, unknown>;
  const cardHeadline =
    (typeof summary.card_headline === "string" && summary.card_headline.trim()) ||
    (typeof full.card_headline === "string" && full.card_headline.trim()) ||
    "";
  const postExcerpt =
    cardHeadline ||
    (typeof summary.headline === "string" ? summary.headline : undefined) ||
    (typeof full.headline === "string" ? full.headline : undefined) ||
    snapshot.title;
  const postBody = reportContentToMarkdown(snapshot.content_full);

  const { data: existingPost } = await supabase
    .from("posts")
    .select("id,published_at")
    .eq("source_type", snapshot.report_type)
    .eq("source_ref", snapshot.period_key)
    .maybeSingle();

  const postPayload = {
    title: snapshot.title,
    slug: postSlug,
    body: postBody,
    excerpt: postExcerpt,
    report_snapshot: snapshot.content_full as Record<string, unknown>,
    source_type: snapshot.report_type,
    source_ref: snapshot.period_key,
    published_at: options.autoPublish ? new Date().toISOString() : (existingPost?.published_at ?? null),
    newsletter_include: false,
    updated_at: new Date().toISOString(),
  };

  let generatedPostId: string | null = null;
  if (existingPost?.id) {
    const { error: updatePostError } = await supabase.from("posts").update(postPayload).eq("id", existingPost.id);
    if (updatePostError) {
      await supabase
        .from("content_generation_runs")
        .update({
          status: "failed",
          source_count: snapshot.sample_count,
          error_message: updatePostError.message,
          finished_at: new Date().toISOString(),
        })
        .eq("run_type", AWARD_MARKET_RUN_TYPE)
        .eq("run_key", runKey);
      return { ok: false, error: updatePostError.message, run_key: runKey };
    }
    generatedPostId = existingPost.id;
  } else {
    const { data: insertedPost, error: insertPostError } = await supabase
      .from("posts")
      .insert({
        ...postPayload,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insertPostError || !insertedPost) {
      await supabase
        .from("content_generation_runs")
        .update({
          status: "failed",
          source_count: snapshot.sample_count,
          error_message: insertPostError?.message ?? "post insert failed",
          finished_at: new Date().toISOString(),
        })
        .eq("run_type", AWARD_MARKET_RUN_TYPE)
        .eq("run_key", runKey);
      return { ok: false, error: insertPostError?.message ?? "post insert failed", run_key: runKey };
    }
    generatedPostId = insertedPost.id;
  }

  await supabase
    .from("report_snapshots")
    .update({ published_post_id: generatedPostId, updated_at: new Date().toISOString() })
    .eq("report_type", snapshot.report_type)
    .eq("period_key", snapshot.period_key);

  await supabase
    .from("content_generation_runs")
    .update({
      status: "success",
      source_count: snapshot.sample_count,
      generated_post_id: generatedPostId,
      payload: {
        report_type: snapshot.report_type,
        period_key: snapshot.period_key,
        title: snapshot.title,
      },
      error_message: null,
      finished_at: new Date().toISOString(),
    })
    .eq("run_type", AWARD_MARKET_RUN_TYPE)
    .eq("run_key", runKey);

  await refreshAwardReportDailyCard(supabase, snapshot.period_key);

  return {
    ok: true,
    skipped: false,
    run_key: runKey,
    report_type: snapshot.report_type,
    period_key: snapshot.period_key,
    post_id: generatedPostId,
    message: options.autoPublish
      ? "낙찰 리포트가 생성·공개되었습니다."
      : "낙찰 리포트 초안이 생성되었습니다. 관리자에서 발행 후 노출됩니다.",
  };
}
