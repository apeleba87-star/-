import type { SupabaseClient } from "@supabase/supabase-js";
import { getHomeTenderStatsWithSpotlightRow } from "@/lib/content/home-tender-stats";
import { getKstTodayUtcRange } from "@/lib/jobs/kst-date";
import { homeSpotlightTenderFromRow } from "@/lib/home/home-spotlight";

type TenderBundle = Awaited<ReturnType<typeof getHomeTenderStatsWithSpotlightRow>>;

/** G2B/refresh-dashboard에서 home_tender_stats upsert 행 생성 */
export function buildHomeTenderStatsUpsertFromBundle(bundle: TenderBundle) {
  const spotlight = homeSpotlightTenderFromRow(bundle.spotlightRow);
  const recentTendersJson = bundle.stats.recentTenders.map((t) => ({
    id: t.id,
    bid_ntce_nm: t.bid_ntce_nm,
    ntce_instt_nm: t.ntce_instt_nm,
    bid_clse_dt: t.bid_clse_dt,
    bsns_dstr_nm: t.bsns_dstr_nm ?? null,
    base_amt: t.base_amt ?? null,
  }));
  return {
    id: 1 as const,
    open_count: bundle.stats.tenderCount,
    today_count: bundle.stats.tenderTodayCount,
    industry_breakdown: bundle.stats.industryBreakdown,
    recent_tender_ids: bundle.stats.recentTenders.map((t) => t.id),
    spotlight_json: spotlight,
    recent_tenders_json: recentTendersJson,
    updated_at: new Date().toISOString(),
  };
}

/**
 * G2B 수집(크론·관리자) 성공 직후: 입찰 스냅샷 + 홈용 뉴스 스냅샷 갱신.
 * 홈 페이지는 이 테이블만 읽도록 하기 위한 단일 진입점.
 */
export async function refreshHomeSnapshotsAfterTenderIngest(supabase: SupabaseClient): Promise<void> {
  await Promise.all([supabase.rpc("refresh_job_post_stats"), supabase.rpc("refresh_listing_stats")]);
  const bundle = await getHomeTenderStatsWithSpotlightRow(supabase);
  const row = buildHomeTenderStatsUpsertFromBundle(bundle);
  await supabase.from("home_tender_stats").upsert(row, { onConflict: "id" });
  await refreshHomeContentStats(supabase);
}

/** 홈 뉴스 스트립·카운트 — 크론·발행·(선택) 관리자 액션에서 호출 */
export async function refreshHomeContentStats(supabase: SupabaseClient): Promise<void> {
  const [newsTodayStart, newsTodayEnd] = getKstTodayUtcRange();
  const [{ count }, { data: posts }] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "estimated", head: true })
      .gte("published_at", newsTodayStart)
      .lte("published_at", newsTodayEnd)
      .eq("is_private", false),
    supabase
      .from("posts")
      .select("id, title, published_at")
      .not("published_at", "is", null)
      .eq("is_private", false)
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  await supabase.from("home_content_stats").upsert(
    {
      id: 1,
      posts_today_count: count ?? 0,
      posts_preview: posts ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}
