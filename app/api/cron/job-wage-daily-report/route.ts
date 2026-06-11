import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { runJobWageDailyReportJob } from "@/lib/jobs/job-wage-daily-report";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import { revalidateJobWageReport } from "@/lib/report/revalidate-job-wage";

export const dynamic = "force-dynamic";

/** KST 오늘 당일(1일) 일당 리포트를 report_date=오늘에 upsert. 스케줄 없으면 /admin/job-wage-report 수동 실행. */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabase();
    const todayKst = getKstTodayString();
    const result = await runJobWageDailyReportJob(supabase, {
      windowDays: 1,
      windowEndKst: todayKst,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    revalidateJobWageReport(result.report_date);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
