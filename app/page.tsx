import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { getActiveHomeAds } from "@/lib/ads";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import { getHomeTenderStats } from "@/lib/content/home-tender-stats";
import HomeDashboard from "@/components/home/HomeDashboard";
import AdPremiumBanner from "@/components/home/AdPremiumBanner";
import TenderSection from "@/components/home/TenderSection";
import NewsSection from "@/components/home/NewsSection";
import AdNativeCard from "@/components/home/AdNativeCard";
import DataInsightSection from "@/components/home/DataInsightSection";

export const revalidate = 60;

const LISTING_DEAL_TYPES = ["referral_regular", "referral_one_time", "sale_regular", "subcontract"];

export default async function HomePage() {
  const supabase = createClient();
  const authSupabase = await createServerSupabase();
  const now = new Date().toISOString();
  const todayKst = getKstTodayString();
  const today = new Date().toISOString().slice(0, 10);
  const todayEnd = today + "T23:59:59.999Z";

  const [
    jobPostStatsRow,
    listingStatsRow,
    homeTenderStatsRow,
    newsCountRes,
    newsPostsRes,
    listingsCountRes,
    recentListingsRes,
    latestNewsletterRes,
    jobsOpenCountRes,
    userRes,
  ] = await Promise.all([
    supabase.from("job_post_stats").select("open_count").maybeSingle(),
    supabase.from("listing_stats").select("total_count").maybeSingle(),
    supabase.from("home_tender_stats").select("open_count, today_count, industry_breakdown, recent_tender_ids, updated_at").maybeSingle(),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("published_at", today)
      .lt("published_at", todayEnd),
    supabase
      .from("posts")
      .select("id, title, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(5),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .in("listing_type", LISTING_DEAL_TYPES),
    supabase
      .from("listings")
      .select("id, title")
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
    supabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .or(`work_date.gte.${todayKst},work_date.is.null`),
    authSupabase.auth.getUser(),
  ]);

  const newsCount = newsCountRes.count ?? 0;
  const news = newsPostsRes.data ?? [];
  const listingStats = listingStatsRow.data;
  const jobPostStats = jobPostStatsRow.data;
  const homeTenderStats = homeTenderStatsRow.data;

  const listingsCount = listingStats?.total_count ?? listingsCountRes.count ?? 0;
  const recentListings = recentListingsRes.data ?? [];
  const latestNewsletter = latestNewsletterRes.data;
  const jobsOpenCount = jobPostStats?.open_count ?? jobsOpenCountRes.count ?? 0;
  const user = userRes.data.user;

  const HOME_TENDER_STATS_STALE_MS = 15 * 60 * 1000;
  const homeTenderStatsFresh =
    homeTenderStats?.updated_at &&
    Date.now() - new Date(homeTenderStats.updated_at).getTime() < HOME_TENDER_STATS_STALE_MS;

  let tenderStats: Awaited<ReturnType<typeof getHomeTenderStats>>;
  if (homeTenderStatsFresh && homeTenderStats && Array.isArray(homeTenderStats.recent_tender_ids) && homeTenderStats.recent_tender_ids.length > 0) {
    const recentIds = homeTenderStats.recent_tender_ids.slice(0, 5);
    const { data: recentRows } = await supabase
      .from("tenders")
      .select("id, bid_ntce_nm, ntce_instt_nm, bid_clse_dt, bsns_dstr_nm, base_amt, raw")
      .in("id", recentIds);
    const order = recentIds.map((id) => (recentRows ?? []).find((r) => r.id === id)).filter(Boolean) as { id: string; bid_ntce_nm: string | null; ntce_instt_nm: string | null; bid_clse_dt: string | null; bsns_dstr_nm: string | null; base_amt: number | null; raw?: unknown }[];
    const industryBreakdown = (Array.isArray(homeTenderStats.industry_breakdown) ? homeTenderStats.industry_breakdown : []) as { industry_code: string; industry_name: string; count: number }[];
    tenderStats = {
      tenderCount: homeTenderStats.open_count ?? 0,
      tenderTodayCount: homeTenderStats.today_count ?? 0,
      topIndustry: null,
      industryBreakdown,
      recentTenders: order.map((t) => ({
        id: t.id,
        bid_ntce_nm: t.bid_ntce_nm,
        ntce_instt_nm: t.ntce_instt_nm,
        bid_clse_dt: t.bid_clse_dt,
        bsns_dstr_nm: t.bsns_dstr_nm ?? null,
        base_amt: t.base_amt != null ? Number(t.base_amt) : null,
        raw: t.raw,
      })),
    };
  } else if (homeTenderStatsFresh && homeTenderStats) {
    tenderStats = {
      tenderCount: homeTenderStats.open_count ?? 0,
      tenderTodayCount: homeTenderStats.today_count ?? 0,
      topIndustry: null,
      industryBreakdown: (Array.isArray(homeTenderStats.industry_breakdown) ? homeTenderStats.industry_breakdown : []) as { industry_code: string; industry_name: string; count: number }[],
      recentTenders: [],
    };
  } else {
    tenderStats = await getHomeTenderStats(supabase, { now });
  }

  let userStats:
    | {
        jobPostsClosed30d: number;
        jobPostsOpen: number;
        applications30d: number;
        matchesCompleted30d: number;
      }
    | undefined;
  if (user) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [
      jobPostsClosedRes,
      jobPostsOpenRes,
      applications30dRes,
      matchesCompleted30dRes,
    ] = await Promise.all([
      authSupabase
        .from("job_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "closed")
        .gte("updated_at", thirtyDaysAgo),
      authSupabase
        .from("job_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "open"),
      authSupabase
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo),
      authSupabase
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .gte("updated_at", thirtyDaysAgo),
    ]);
    userStats = {
      jobPostsClosed30d: jobPostsClosedRes.count ?? 0,
      jobPostsOpen: jobPostsOpenRes.count ?? 0,
      applications30d: applications30dRes.count ?? 0,
      matchesCompleted30d: matchesCompleted30dRes.count ?? 0,
    };
  }

  const ads = await getActiveHomeAds();

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
        userStats={userStats}
      />

      <div className="mx-auto w-full max-w-2xl px-4 pt-2 pb-10 sm:px-6 sm:pb-12">
        {ads.premium_banner?.enabled && ads.premium_banner.campaign ? (
          <AdPremiumBanner campaign={ads.premium_banner.campaign} />
        ) : null}

        <TenderSection
          tenders={tenderStats.recentTenders}
          relatedCount={tenderStats.tenderCount}
          todayCount={tenderStats.tenderTodayCount}
          industryBreakdown={tenderStats.industryBreakdown}
        />
        <NewsSection posts={news} />

        {ads.native_card?.enabled && ads.native_card.campaign ? (
          <AdNativeCard campaign={ads.native_card.campaign} />
        ) : null}

        <DataInsightSection />
      </div>
    </>
  );
}
