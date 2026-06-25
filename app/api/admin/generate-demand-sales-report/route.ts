import { NextRequest, NextResponse } from "next/server";

import { runDemandSalesRegionReportJob } from "@/lib/content/demand-sales-region-report-job";
import { parseDemandSalesScope } from "@/lib/content/demand-sales-region-report-templates";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
    const scope = parseDemandSalesScope(url.searchParams.get("scope"));
    const shouldPublish = process.env.CONTENT_AUTO_PUBLISH === "true";
    const supabase = createServiceSupabase();

    const result = await runDemandSalesRegionReportJob(supabase, {
      force,
      autoPublish: shouldPublish,
      scope,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, run_key: result.run_key }, { status: 500 });
    }

    if (result.skipped) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
        run_key: result.run_key,
        message: result.message ?? result.reason,
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
        ? "입주청소 영업지역 리포트가 생성·공개되었습니다."
        : "입주청소 영업지역 리포트 초안이 생성되었습니다. 관리자 글 관리에서 발행 후 노출됩니다.",
      results: "results" in result ? result.results : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
