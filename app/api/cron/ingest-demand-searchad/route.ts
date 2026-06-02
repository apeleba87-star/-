import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { runDemandSearchAdMonthlyIngestJob } from "@/lib/demand/searchad-monthly-ingest";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/**
 * 검색광고 검색량 — KST 기준 매월 1회 스냅샷.
 * demand_keyword_monthly (keyword, region, yyyymm) 유니크 → 월이 지날수록 1년 차트 누적.
 */
export async function GET(req: NextRequest) {
  return handleIngest(req);
}

export async function POST(req: NextRequest) {
  return handleIngest(req);
}

async function handleIngest(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabase();
    const result = await runDemandSearchAdMonthlyIngestJob(supabase);
    return NextResponse.json(
      { job: "searchad_monthly_snapshot", ...result },
      { status: result.ok ? 200 : 500 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
