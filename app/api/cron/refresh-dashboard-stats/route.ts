import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getHomeTenderStats } from "@/lib/content/home-tender-stats";

export const dynamic = "force-dynamic";

/**
 * 조회용 집계 테이블 갱신 (job_post_stats, listing_stats, home_tender_stats)
 * - 크론에서 주기 호출 (예: 5~15분)
 * - 캐시 무효화: 새 구인글/현장거래/공고 수집 완료 시 이 경로 호출하면 홈 숫자 갱신
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabase();

    const [jobRes, listingRes, tenderStats] = await Promise.all([
      supabase.rpc("refresh_job_post_stats"),
      supabase.rpc("refresh_listing_stats"),
      getHomeTenderStats(supabase),
    ]);

    if (jobRes.error) {
      return NextResponse.json(
        { ok: false, error: `job_post_stats: ${jobRes.error.message}` },
        { status: 500 }
      );
    }
    if (listingRes.error) {
      return NextResponse.json(
        { ok: false, error: `listing_stats: ${listingRes.error.message}` },
        { status: 500 }
      );
    }

    const recentIds = tenderStats.recentTenders.map((t) => t.id);
    const { error: upsertError } = await supabase.from("home_tender_stats").upsert(
      {
        id: 1,
        open_count: tenderStats.tenderCount,
        today_count: tenderStats.tenderTodayCount,
        industry_breakdown: tenderStats.industryBreakdown,
        recent_tender_ids: recentIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      return NextResponse.json(
        { ok: false, error: `home_tender_stats: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      job_post_stats: "ok",
      listing_stats: "ok",
      home_tender_stats: "ok",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
