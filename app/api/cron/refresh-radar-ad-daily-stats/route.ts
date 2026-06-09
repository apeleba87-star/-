import { NextRequest, NextResponse } from "next/server";
import { getKstTodayString, addDaysToDateString } from "@/lib/jobs/kst-date";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** radar_ad_events → radar_ad_daily_stats 일별 집계 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabase();
    const today = getKstTodayString();
    const yesterday = addDaysToDateString(today, -1);

    for (const d of [yesterday, today]) {
      const { error } = await supabase.rpc("refresh_radar_ad_daily_stats", { p_target_date: d });
      if (error) {
        console.error("[refresh-radar-ad-daily-stats]", d, error);
        return NextResponse.json({ ok: false, error: `${d}: ${error.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, dates: [yesterday, today] });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
