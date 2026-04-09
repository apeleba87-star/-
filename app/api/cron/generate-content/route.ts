/**
 * 자동 콘텐츠 생성 cron.
 * GET/POST: type=daily | weekly | monthly, force=true (선택)
 * - Vercel Cron: GET + Authorization Bearer CRON_SECRET
 * - 평일(KST)만 일간 리포트 실행, 주말은 skipped
 * - 일간: 생성 후 posts.published_at 설정(자동 발행)
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceSupabase } from "@/lib/supabase-server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getRunKey, getRunTypeFromApi, GENERATOR_VERSION } from "@/lib/content/content-generation-runs";
import { getDailyReportCronSkipReason } from "@/lib/content/daily-report-cron-window";
import { buildDailyTenderReport } from "@/lib/content/build-daily-tender-report";
import { buildReportSnapshots } from "@/lib/content/build-report-snapshots";
import { refreshHomeContentStats } from "@/lib/content/refresh-home-page-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handleGenerateContent(req);
}

export async function POST(req: NextRequest) {
  return handleGenerateContent(req);
}

async function handleGenerateContent(req: NextRequest): Promise<NextResponse> {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "daily";
    const force = searchParams.get("force") === "true";

    const runType = getRunTypeFromApi(type);
    if (!runType) {
      return NextResponse.json({ error: "Invalid type. Use daily." }, { status: 400 });
    }
    if (runType !== "daily_tender_digest") {
      return NextResponse.json({ error: "Only type=daily is implemented." }, { status: 400 });
    }

    const reportSkip = getDailyReportCronSkipReason();
    if (reportSkip) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: reportSkip,
      });
    }

    const supabase = createServiceSupabase();
    const runKey = getRunKey(runType);

    const { data: existingRun } = await supabase
      .from("content_generation_runs")
      .select("id, status, attempt_count")
      .eq("run_type", runType)
      .eq("run_key", runKey)
      .maybeSingle();

    if (existingRun?.status === "success" && !force) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "already_success",
        run_key: runKey,
      });
    }

    const attemptCount = (existingRun?.attempt_count ?? 0) + 1;
    await supabase.from("content_generation_runs").upsert(
      {
        run_type: runType,
        run_key: runKey,
        status: "pending",
        started_at: new Date().toISOString(),
        attempt_count: attemptCount,
        generator_version: GENERATOR_VERSION,
      },
      { onConflict: "run_type,run_key", ignoreDuplicates: false }
    );

    const result = await buildDailyTenderReport(supabase, { force, autoPublish: true });

    if (!result.ok) {
      await supabase
        .from("content_generation_runs")
        .update({
          status: "failed",
          error_message: result.reason,
          finished_at: new Date().toISOString(),
        })
        .eq("run_type", runType)
        .eq("run_key", runKey);
      return NextResponse.json(
        { ok: false, error: result.reason, run_key: runKey },
        { status: 500 }
      );
    }

    const snapshots = await buildReportSnapshots(supabase, { date: new Date() });
    if (!snapshots.ok) {
      console.warn("[generate-content] report_snapshots:", snapshots.error);
    }

    if (result.skipped) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
        run_key: runKey,
        snapshots: snapshots.ok ? { created: snapshots.created, skipped: snapshots.skipped } : undefined,
      });
    }

    try {
      await refreshHomeContentStats(supabase);
    } catch {
      /* 홈 스냅샷 실패해도 발행은 성공으로 처리 */
    }
    revalidatePath("/");
    revalidatePath("/news");

    return NextResponse.json({
      ok: true,
      skipped: false,
      post_id: result.postId,
      run_id: result.runId,
      run_key: runKey,
      auto_published: true,
      snapshots: snapshots.ok ? { created: snapshots.created, skipped: snapshots.skipped } : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-content]", message, err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
