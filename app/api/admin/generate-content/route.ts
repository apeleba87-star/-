/**
 * 관리자 수동: 자동 콘텐츠(일간 입찰 리포트) 생성
 * POST ?type=daily&force=true(선택) — 세션으로 admin/editor 확인 후 생성
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getRunKey, getRunTypeFromApi, GENERATOR_VERSION } from "@/lib/content/content-generation-runs";
import { buildDailyTenderReport } from "@/lib/content/build-daily-tender-report";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabase();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin" && profile?.role !== "editor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url ?? "", "http://localhost");
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
        message: "오늘 회차는 이미 생성되었습니다. 재생성하려면 '재생성'에 체크 후 실행하세요.",
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
        message: result.reason === "no_tenders" ? "오늘 등록된 입찰이 없어 건너뛰었습니다." : result.reason,
      });
    }

    return NextResponse.json({
      ok: true,
      skipped: false,
      post_id: result.postId,
      run_id: result.runId,
      run_key: runKey,
      message: "일간 입찰 리포트가 생성되었습니다. 글 관리에서 확인·발행할 수 있습니다.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/generate-content]", message, err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
