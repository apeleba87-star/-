import { Suspense } from "react";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { getActiveHomeAds } from "@/lib/ads";
import { getHomeTenderStats } from "@/lib/content/home-tender-stats";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import { getKstTodayString, getKstTodayUtcRange } from "@/lib/jobs/kst-date";
import HomeDashboard from "@/components/home/HomeDashboard";
import TenderSection from "@/components/home/TenderSection";
import NewsSection from "@/components/home/NewsSection";
import DataInsightSection from "@/components/home/DataInsightSection";
import HomeUserStatsSection from "@/components/home/HomeUserStatsSection";
import HomeUserStatsSkeleton from "@/components/home/HomeUserStatsSkeleton";
import HomeUserStatsGuestPlaceholder from "@/components/home/HomeUserStatsGuestPlaceholder";

export const revalidate = 60;

const LISTING_DEAL_TYPES = ["referral_regular", "referral_one_time", "sale_regular", "subcontract"];

/**
 * 홈 첫 렌더: 집계 테이블 + 얕은 최신 목록만. 개인화(userStats)는 Suspense로 후속 스트리밍.
 * getHomeTenderStats() 호출 제거 — 홈은 home_tender_stats만 읽고, 갱신은 크론이 담당.
 */
export default async function HomePage() {
  const supabase = createClient();
  const authSupabase = await createServerSupabase();
  const todayKst = getKstTodayString();
  const [newsTodayStart, newsTodayEnd] = getKstTodayUtcRange();

  const [
    jobPostStatsRow,
    listingStatsRow,
    homeTenderStatsRow,
    newsCountRes,
    newsPostsRes,
    recentListingsRes,
    latestNewsletterRes,
    userRes,
  ] = await Promise.all([
    supabase.from("job_post_stats").select("open_count").maybeSingle(),
    supabase.from("listing_stats").select("total_count").maybeSingle(),
    supabase.from("home_tender_stats").select("open_count, today_count, industry_breakdown, recent_tender_ids, updated_at").maybeSingle(),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("published_at", newsTodayStart)
      .lte("published_at", newsTodayEnd),
    supabase
      .from("posts")
      .select("id, title, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(5),
    supabase
      .from("listings")
      .select("id, title")
      .eq("status", "open")
      .in("listing_type", LISTING_DEAL_TYPES)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("newsletter_issues")
      .select("id, subject, sent_at")
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    authSupabase.auth.getUser(),
  ]);

  const newsCount = newsCountRes.count ?? 0;
  const news = newsPostsRes.data ?? [];
  const listingStats = listingStatsRow.data;
  const jobPostStats = jobPostStatsRow.data;
  const homeTenderStats = homeTenderStatsRow.data;

  let listingsCount = listingStats?.total_count ?? 0;
  const jobsOpenCount = jobPostStats?.open_count ?? 0;
  const recentListings = recentListingsRes.data ?? [];
  const latestNewsletter = latestNewsletterRes.data;
  const user = userRes.data.user;

  // 등록 업종(업종관리 사용 ON) 기준 건수만 사용. fallback 시에도 getHomeTenderStats로 동일 기준 적용.
  let industryBreakdown = (Array.isArray(homeTenderStats?.industry_breakdown)
    ? homeTenderStats.industry_breakdown
    : []) as { industry_code: string; industry_name: string; count: number }[];

  const needTenderFallback = homeTenderStats == null || homeTenderStats.open_count === 0;
  const needListingFallback = listingStats == null || listingStats.total_count === 0;
  const fallbackPromises: Promise<unknown>[] = [];

  if (needTenderFallback) {
    fallbackPromises.push(getHomeTenderStats(supabase).then((stats) => ({ stats })));
  } else {
    fallbackPromises.push(Promise.resolve(null));
  }
  if (needListingFallback) {
    fallbackPromises.push(
      (async () => {
        const res = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
          .in("listing_type", LISTING_DEAL_TYPES);
        return { listingCount: res.count ?? 0 };
      })()
    );
  } else {
    fallbackPromises.push(Promise.resolve(null));
  }

  const fallbackResults = await Promise.all(fallbackPromises);
  let tenderCount = homeTenderStats?.open_count ?? 0;
  let tenderTodayCount = homeTenderStats?.today_count ?? 0;
  let fallbackTenders: { id: string; bid_ntce_nm: string | null; ntce_instt_nm: string | null; bid_clse_dt: string | null; bsns_dstr_nm: string | null; base_amt: number | null; raw?: unknown }[] = [];
  if (needTenderFallback && fallbackResults[0] != null && typeof fallbackResults[0] === "object" && "stats" in fallbackResults[0]) {
    const r = fallbackResults[0] as { stats: Awaited<ReturnType<typeof getHomeTenderStats>> };
    tenderCount = r.stats.tenderCount;
    tenderTodayCount = r.stats.tenderTodayCount;
    industryBreakdown = r.stats.industryBreakdown;
    fallbackTenders = r.stats.recentTenders.map((t) => ({
      id: t.id,
      bid_ntce_nm: t.bid_ntce_nm,
      ntce_instt_nm: t.ntce_instt_nm,
      bid_clse_dt: t.bid_clse_dt,
      bsns_dstr_nm: t.bsns_dstr_nm ?? null,
      base_amt: t.base_amt ?? null,
      raw: t.raw,
    }));
  }
  if (needListingFallback && fallbackResults[1] != null && typeof fallbackResults[1] === "object" && "listingCount" in fallbackResults[1]) {
    const r = fallbackResults[1] as { listingCount: number };
    listingsCount = r.listingCount;
  }

  let recentTenders: { id: string; bid_ntce_nm: string | null; ntce_instt_nm: string | null; bid_clse_dt: string | null; bsns_dstr_nm: string | null; base_amt: number | null; raw?: unknown }[] = [];
  if (fallbackTenders.length > 0) {
    recentTenders = fallbackTenders;
  } else if (homeTenderStats?.recent_tender_ids && Array.isArray(homeTenderStats.recent_tender_ids) && homeTenderStats.recent_tender_ids.length > 0) {
    const recentIds = homeTenderStats.recent_tender_ids.slice(0, 5);
    const { data: recentRows } = await supabase
      .from("tenders")
      .select("id, bid_ntce_nm, ntce_instt_nm, bid_clse_dt, bsns_dstr_nm, base_amt, raw")
      .in("id", recentIds);
    const order = recentIds.map((id) => (recentRows ?? []).find((r) => r.id === id)).filter(Boolean) as { id: string; bid_ntce_nm: string | null; ntce_instt_nm: string | null; bid_clse_dt: string | null; bsns_dstr_nm: string | null; base_amt: number | null; raw?: unknown }[];
    recentTenders = order.map((t) => ({
      id: t.id,
      bid_ntce_nm: t.bid_ntce_nm,
      ntce_instt_nm: t.ntce_instt_nm,
      bid_clse_dt: t.bid_clse_dt,
      bsns_dstr_nm: t.bsns_dstr_nm ?? null,
      base_amt: t.base_amt != null ? Number(t.base_amt) : null,
      raw: t.raw,
    }));
  }

  const tenderStats = {
    tenderCount,
    tenderTodayCount,
    topIndustry: null as { code: string; name: string; count: number } | null,
    industryBreakdown,
    recentTenders,
  };

  const ads = await getActiveHomeAds();

  const userStatsSlot =
    user != null ? (
      <Suspense fallback={<HomeUserStatsSkeleton />}>
        <HomeUserStatsSection userId={user.id} todayKst={todayKst} />
      </Suspense>
    ) : (
      <HomeUserStatsGuestPlaceholder />
    );

  return (
    <>
      <HomeDashboard
        tenderCount={tenderStats.tenderCount}
        tenderTodayCount={tenderStats.tenderTodayCount}
        newsCount={newsCount}
        listingsCount={listingsCount}
        recentListings={recentListings}
        jobsOpenCount={jobsOpenCount}
        latestNewsletter={latestNewsletter}
        isLoggedIn={!!user}
        userStatsSlot={userStatsSlot}
      />

      <div className="mx-auto w-full max-w-2xl px-4 pt-2 pb-10 sm:px-6 sm:pb-12">
        {(ads.premium_banner?.enabled && (ads.premium_banner.campaign || ads.premium_banner.script_content)) ? (
          <AdSlotRenderer slot={ads.premium_banner} variant="banner" />
        ) : null}

        <TenderSection
          tenders={tenderStats.recentTenders}
          relatedCount={tenderStats.tenderCount}
          todayCount={tenderStats.tenderTodayCount}
          industryBreakdown={tenderStats.industryBreakdown}
          isLoggedIn={!!user}
        />
        <NewsSection posts={news} isLoggedIn={!!user} />

        {(ads.native_card?.enabled && (ads.native_card.campaign || ads.native_card.script_content)) ? (
          <AdSlotRenderer slot={ads.native_card} variant="card" />
        ) : null}

        {(ads.home_bottom?.enabled && (ads.home_bottom.campaign || ads.home_bottom.script_content)) ? (
          <div className="mt-8">
            <AdSlotRenderer slot={ads.home_bottom} variant="card" />
          </div>
        ) : null}

        <DataInsightSection />
      </div>
    </>
  );
}
