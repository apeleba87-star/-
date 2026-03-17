import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * ad_events → ad_daily_stats 일별 집계 갱신
 * 크론에서 매일 1회(예: 00:05) 또는 수시 호출 시 어제·오늘 집계 반영
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabase();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().slice(0, 10);

    for (const d of [yesterday, today]) {
      const { error } = await supabase.rpc("refresh_ad_daily_stats", { p_target_date: d });
      if (error) {
        console.error("[refresh-ad-daily-stats]", d, error);
        return NextResponse.json(
          { ok: false, error: `${d}: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, dates: [yesterday, today] });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
