import type { SupabaseClient } from "@supabase/supabase-js";

import { buildDemandSalesRegionReportSnapshot } from "@/lib/content/build-demand-sales-region-report";
import { GENERATOR_VERSION } from "@/lib/content/content-generation-runs";
import { reportContentToMarkdown } from "@/lib/content/snapshot-to-post-body";
import {
  DEFAULT_DEMAND_SALES_REPORT_SCOPES,
  DEMAND_SALES_REGION_RUN_TYPE,
  demandSalesPostSlug,
  demandSalesReportDescription,
  demandSalesScopeKey,
  type DemandSalesReportScope,
} from "@/lib/content/demand-sales-region-report-templates";

type SingleResult =
  | {
      ok: true;
      skipped: false;
      run_key: string;
      report_type: string;
      period_key: string;
      post_id: string | null;
      message: string;
    }
  | { ok: true; skipped: true; reason: string; run_key?: string; message?: string }
  | { ok: false; error: string; run_key?: string };

export type DemandSalesRegionReportJobResult =
  | (SingleResult & { scope_key?: string })
  | {
      ok: true;
      skipped: false;
      run_key: string;
      report_type: string;
      period_key: string;
      post_id: string | null;
      message: string;
      results: Array<SingleResult & { scope_key: string }>;
    };

function kstMonthKey(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

async function markRunFailed(
  supabase: SupabaseClient,
  runKey: string,
  error: string,
  sourceCount = 0
): Promise<void> {
  await supabase
    .from("content_generation_runs")
    .update({
      status: "failed",
      source_count: sourceCount,
      error_message: error,
      finished_at: new Date().toISOString(),
    })
    .eq("run_type", DEMAND_SALES_REGION_RUN_TYPE)
    .eq("run_key", runKey);
}

async function runDemandSalesRegionReportForScope(
  supabase: SupabaseClient,
  options: { scope: DemandSalesReportScope; force: boolean; autoPublish: boolean; at: Date }
): Promise<SingleResult & { scope_key: string }> {
  const scopeKey = demandSalesScopeKey(options.scope);
  const runKey = `demand-sales:${kstMonthKey(options.at)}:${scopeKey}`;

  const { data: existingRun } = await supabase
    .from("content_generation_runs")
    .select("id, status, attempt_count")
    .eq("run_type", DEMAND_SALES_REGION_RUN_TYPE)
    .eq("run_key", runKey)
    .maybeSingle();

  if (existingRun?.status === "success" && !options.force) {
    return {
      ok: true,
      skipped: true,
      reason: "already_success",
      run_key: runKey,
      scope_key: scopeKey,
      message: "해당 입주청소 영업지역 리포트는 이미 생성되었습니다.",
    };
  }

  const attemptCount = Number(existingRun?.attempt_count ?? 0) + 1;
  const upsertRun = await supabase
    .from("content_generation_runs")
    .upsert(
      {
        run_type: DEMAND_SALES_REGION_RUN_TYPE,
        run_key: runKey,
        status: "pending",
        started_at: new Date().toISOString(),
        attempt_count: attemptCount,
        generator_version: GENERATOR_VERSION,
      },
      { onConflict: "run_type,run_key", ignoreDuplicates: false }
    )
    .select("id")
    .single();
  const runId = upsertRun.data?.id ?? existingRun?.id ?? null;

  if (upsertRun.error) {
    return { ok: false, error: upsertRun.error.message, run_key: runKey, scope_key: scopeKey };
  }

  const snapshot = await buildDemandSalesRegionReportSnapshot(supabase, {
    scope: options.scope,
    at: options.at,
  });

  if (!snapshot) {
    await supabase
      .from("content_generation_runs")
      .update({
        status: "skipped",
        source_count: 0,
        error_message: null,
        finished_at: new Date().toISOString(),
      })
      .eq("run_type", DEMAND_SALES_REGION_RUN_TYPE)
      .eq("run_key", runKey);
    return {
      ok: true,
      skipped: true,
      reason: "no_demand_data",
      run_key: runKey,
      scope_key: scopeKey,
      message: "입주청소 영업지역 리포트를 만들 데이터가 부족합니다.",
    };
  }

  const { error: snapshotError } = await supabase.from("report_snapshots").upsert(
    {
      run_id: runId,
      report_type: snapshot.report_type,
      period_key: snapshot.period_key,
      title: snapshot.title,
      content_full: snapshot.content_full as unknown as Record<string, unknown>,
      content_summary: snapshot.content_summary as unknown as Record<string, unknown>,
      content_social: snapshot.content_social,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "report_type,period_key" }
  );

  if (snapshotError) {
    await markRunFailed(supabase, runKey, snapshotError.message, snapshot.sample_count);
    return { ok: false, error: snapshotError.message, run_key: runKey, scope_key: scopeKey };
  }

  const { data: existingPost } = await supabase
    .from("posts")
    .select("id,published_at")
    .eq("source_type", snapshot.report_type)
    .eq("source_ref", snapshot.period_key)
    .maybeSingle();

  const postPayload = {
    title: snapshot.title,
    slug: demandSalesPostSlug(snapshot.period_key),
    body: reportContentToMarkdown(snapshot.content_full),
    excerpt: demandSalesReportDescription(snapshot.title),
    report_snapshot: snapshot.content_full as unknown as Record<string, unknown>,
    source_type: snapshot.report_type,
    source_ref: snapshot.period_key,
    newsletter_include: false,
    published_at: options.autoPublish ? new Date().toISOString() : (existingPost?.published_at ?? null),
    updated_at: new Date().toISOString(),
  };

  let postId: string | null = null;
  if (existingPost?.id) {
    const { error: updateError } = await supabase.from("posts").update(postPayload).eq("id", existingPost.id);
    if (updateError) {
      await markRunFailed(supabase, runKey, updateError.message, snapshot.sample_count);
      return { ok: false, error: updateError.message, run_key: runKey, scope_key: scopeKey };
    }
    postId = existingPost.id;
  } else {
    const { data: insertedPost, error: insertError } = await supabase
      .from("posts")
      .insert({
        ...postPayload,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insertError || !insertedPost) {
      const message = insertError?.message ?? "post insert failed";
      await markRunFailed(supabase, runKey, message, snapshot.sample_count);
      return { ok: false, error: message, run_key: runKey, scope_key: scopeKey };
    }
    postId = insertedPost.id;
  }

  await supabase
    .from("report_snapshots")
    .update({ published_post_id: postId, updated_at: new Date().toISOString() })
    .eq("report_type", snapshot.report_type)
    .eq("period_key", snapshot.period_key);

  await supabase
    .from("content_generation_runs")
    .update({
      status: "success",
      source_count: snapshot.sample_count,
      generated_post_id: postId,
      payload: {
        report_type: snapshot.report_type,
        period_key: snapshot.period_key,
        title: snapshot.title,
        scope_key: scopeKey,
      },
      error_message: null,
      finished_at: new Date().toISOString(),
    })
    .eq("run_type", DEMAND_SALES_REGION_RUN_TYPE)
    .eq("run_key", runKey);

  return {
    ok: true,
    skipped: false,
    run_key: runKey,
    scope_key: scopeKey,
    report_type: snapshot.report_type,
    period_key: snapshot.period_key,
    post_id: postId,
    message: options.autoPublish
      ? "입주청소 영업지역 리포트가 생성·공개되었습니다."
      : "입주청소 영업지역 리포트 초안이 생성되었습니다.",
  };
}

export async function runDemandSalesRegionReportJob(
  supabase: SupabaseClient,
  options: {
    force: boolean;
    autoPublish: boolean;
    at?: Date;
    scope?: DemandSalesReportScope | null;
  }
): Promise<DemandSalesRegionReportJobResult> {
  const at = options.at ?? new Date();
  if (options.scope) {
    return runDemandSalesRegionReportForScope(supabase, {
      scope: options.scope,
      force: options.force,
      autoPublish: options.autoPublish,
      at,
    });
  }

  const results = await Promise.all(
    DEFAULT_DEMAND_SALES_REPORT_SCOPES.map((scope) =>
      runDemandSalesRegionReportForScope(supabase, {
        scope,
        force: options.force,
        autoPublish: options.autoPublish,
        at,
      })
    )
  );
  const firstError = results.find((result) => !result.ok) as Extract<(typeof results)[number], { ok: false }> | undefined;
  if (firstError) return firstError;

  const created = results.find((result) => result.ok && !result.skipped) as
    | Extract<(typeof results)[number], { ok: true; skipped: false }>
    | undefined;

  return {
    ok: true,
    skipped: false,
    run_key: `demand-sales:${kstMonthKey(at)}:batch`,
    report_type: created?.report_type ?? "demand_sales_region",
    period_key: created?.period_key ?? `${kstMonthKey(at)}:batch`,
    post_id: created?.post_id ?? null,
    message: `입주청소 영업지역 리포트 ${results.length}개 scope 생성을 처리했습니다.`,
    results,
  };
}
