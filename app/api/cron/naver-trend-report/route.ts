import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { runNaverTrendReportJob } from "@/lib/naver/trend-report";

export const dynamic = "force-dynamic";

/** KST 기준 전일까지 30일 윈도우로 데이터랩 조회 후 일일 리포트 저장. 예: 매일 07:00 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
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
