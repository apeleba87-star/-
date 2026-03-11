/**
 * 자동 콘텐츠 생성 cron.
 * GET/POST: type=daily | weekly | monthly, force=true (선택)
 * 1단계: daily만 구현.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getRunKey, getRunTypeFromApi, GENERATOR_VERSION } from "@/lib/content/content-generation-runs";
import { buildDailyTenderReport } from "@/lib/content/build-daily-tender-report";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
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

    const result = await buildDailyTenderReport(supabase, { force });

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

    if (result.skipped) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
        run_key: runKey,
      });
    }

    return NextResponse.json({
      ok: true,
      skipped: false,
      post_id: result.postId,
      run_id: result.runId,
      run_key: runKey,
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
