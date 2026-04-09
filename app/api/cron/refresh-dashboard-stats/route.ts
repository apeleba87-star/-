import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getHomeTenderStatsWithSpotlightRow } from "@/lib/content/home-tender-stats";
import {
  buildHomeTenderStatsUpsertFromBundle,
  refreshHomeContentStats,
} from "@/lib/content/refresh-home-page-stats";
import { getKstTodayString } from "@/lib/jobs/kst-date";

export const dynamic = "force-dynamic";

/**
 * 조회용 집계 테이블 갱신 (job_post_stats, listing_stats, home_tender_stats)
 * - 일정(work_date)이 지난 구인글은 자동 마감 처리 후 집계
 * - 크론에서 주기 호출 (예: 5~15분)
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabase();
    const todayKst = getKstTodayString();

    const { data: toClose } = await supabase
      .from("job_posts")
      .select("id")
      .eq("status", "open")
      .not("work_date", "is", null)
      .lt("work_date", todayKst);
    const ids = (toClose ?? []).map((r) => r.id);
    if (ids.length > 0) {
      await supabase
        .from("job_posts")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .in("id", ids);
    }

    const [jobRes, listingRes, tenderBundle] = await Promise.all([
      supabase.rpc("refresh_job_post_stats"),
      supabase.rpc("refresh_listing_stats"),
      getHomeTenderStatsWithSpotlightRow(supabase),
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

    const tenderRow = buildHomeTenderStatsUpsertFromBundle(tenderBundle);
    const { error: upsertError } = await supabase.from("home_tender_stats").upsert(tenderRow, {
      onConflict: "id",
    });

    if (upsertError) {
      return NextResponse.json(
        { ok: false, error: `home_tender_stats: ${upsertError.message}` },
        { status: 500 }
      );
    }

    await refreshHomeContentStats(supabase);
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      job_post_stats: "ok",
      listing_stats: "ok",
      home_tender_stats: "ok",
      job_posts_closed: ids.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
