import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { runJobWageDailyReportJob } from "@/lib/jobs/job-wage-daily-report";

export const dynamic = "force-dynamic";

/** KST 어제 말일 기준 달력 30일 일당 리포트를 report_date=어제에 upsert. 스케줄 없으면 /admin/job-wage-report 수동 실행. */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabase();
    const result = await runJobWageDailyReportJob(supabase);
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
