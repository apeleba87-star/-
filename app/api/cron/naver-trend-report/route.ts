import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { runNaverTrendReportJob } from "@/lib/naver/trend-report";

export const dynamic = "force-dynamic";
/** 데이터랩 다건 호출 가능 */
export const maxDuration = 300;

/**
 * KST 기준 전일까지 30일 윈도우로 데이터랩 조회 후 일일 리포트 저장.
 * Vercel Cron: 매일 UTC 18:00 = 한국 시간 03:00. 실행 시점의 KST “오늘” 기준 어제가 endDate.
 */
export async function GET(req: NextRequest) {
  return handleNaverTrendCron(req);
}

export async function POST(req: NextRequest) {
  return handleNaverTrendCron(req);
}

async function handleNaverTrendCron(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabase();
    const result = await runNaverTrendReportJob(supabase);
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
