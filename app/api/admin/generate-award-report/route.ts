/**
 * 관리자 수동: 낙찰 리포트 스냅샷 생성
 * POST ?force=true(선택) — 동일 period_key 이미 성공이면 기본 건너뜀
 * 발행 시각: CONTENT_AUTO_PUBLISH=true 일 때만 즉시 공개 (그 외 초안)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { runAwardMarketReportJob } from "@/lib/content/award-market-report-job";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await createServerSupabase();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin" && profile?.role !== "editor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url ?? "", "http://localhost");
    const force = url.searchParams.get("force") === "true";
    const shouldPublish = process.env.CONTENT_AUTO_PUBLISH === "true";
    const supabase = createServiceSupabase();

    const result = await runAwardMarketReportJob(supabase, { force, autoPublish: shouldPublish });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, run_key: result.run_key }, { status: 500 });
    }

    if (result.skipped) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
        run_key: result.run_key,
        message:
          result.reason === "already_success"
            ? "오늘 회차 낙찰 리포트는 이미 생성되었습니다. 재생성 체크 후 다시 실행하세요."
            : (result.message ?? result.reason),
      });
    }

    return NextResponse.json({
      ok: true,
      skipped: false,
      run_key: result.run_key,
      report_type: result.report_type,
      period_key: result.period_key,
      post_id: result.post_id,
      message: shouldPublish
        ? "낙찰 리포트가 생성·공개되었습니다. 낙찰 리포트 탭에서 확인하세요."
        : "낙찰 리포트 초안이 생성되었습니다. 관리자 글 관리에서 발행 후 노출됩니다.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
