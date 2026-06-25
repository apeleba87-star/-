import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { verifyCronSecret } from "@/lib/cron-auth";
import { runDemandSalesRegionReportJob } from "@/lib/content/demand-sales-region-report-job";
import { parseDemandSalesScope } from "@/lib/content/demand-sales-region-report-templates";
import { refreshHomeContentStats } from "@/lib/content/refresh-home-page-stats";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest): Promise<NextResponse> {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url ?? "", "http://localhost");
    const force = url.searchParams.get("force") === "true";
    const scope = parseDemandSalesScope(url.searchParams.get("scope"));
    const supabase = createServiceSupabase();
    const result = await runDemandSalesRegionReportJob(supabase, {
      force,
      autoPublish: true,
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
        message: result.message,
      });
    }

    try {
      await refreshHomeContentStats(supabase);
    } catch {
      /* ignore */
    }
    revalidatePath("/");
    revalidatePath("/news");

    return NextResponse.json({
      ok: true,
      skipped: false,
      run_key: result.run_key,
      report_type: result.report_type,
      period_key: result.period_key,
      post_id: result.post_id,
      message: result.message,
      results: "results" in result ? result.results : undefined,
      auto_published: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/generate-demand-sales-report]", message, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
