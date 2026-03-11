import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { getActiveHomeAds } from "@/lib/ads";
import { getKstTodayString } from "@/lib/jobs/kst-date";
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
  const today = new Date().toISOString().slice(0, 10);
  const todayEnd = today + "T23:59:59.999Z";
  const now = new Date().toISOString();
  const todayKst = getKstTodayString();

  const [
    relatedOpenCountRes,
    todayRelatedCountRes,
    openTendersRes,
    newsCountRes,
    newsPostsRes,
    listingsCountRes,
    recentListingsRes,
    latestNewsletterRes,
    jobsOpenCountRes,
    userRes,
  ] = await Promise.all([
    supabase
      .from("tenders")
      .select("*", { count: "exact", head: true })
      .gt("bid_clse_dt", now)
      .overlaps("categories", ["cleaning", "disinfection"]),
    supabase
      .from("tenders")
      .select("*", { count: "exact", head: true })
      .gte("bid_ntce_dt", today)
      .lt("bid_ntce_dt", todayEnd)
      .overlaps("categories", ["cleaning", "disinfection"]),
    supabase
      .from("tenders")
      .select("id, bid_ntce_nm, ntce_instt_nm, bid_clse_dt, bsns_dstr_nm, base_amt, raw")
      .gt("bid_clse_dt", now)
      .overlaps("categories", ["cleaning", "disinfection"])
      .order("bid_clse_dt", { ascending: true })
      .limit(5),
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

  const relatedOpenCount = relatedOpenCountRes.count ?? 0;
  const todayRelatedCount = todayRelatedCountRes.count ?? 0;
  const newsCount = newsCountRes.count ?? 0;
  const tenders = openTendersRes.data ?? [];
  const news = newsPostsRes.data ?? [];
  const listingsCount = listingsCountRes.count ?? 0;
  const recentListings = recentListingsRes.data ?? [];
  const latestNewsletter = latestNewsletterRes.data;
  const jobsOpenCount = jobsOpenCountRes.count ?? 0;
  const user = userRes.data.user;

  let userStats: { myJobPostsCount: number; myApplicationsCount: number; myMatchesCount: number } | undefined;
  if (user) {
    const [myPostsRes, myAppsRes] = await Promise.all([
      authSupabase.from("job_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      authSupabase
        .from("job_applications")
        .select("id, status")
        .eq("user_id", user.id),
    ]);
    const myApplications = myAppsRes.data ?? [];
    const appliedCount = myApplications.filter((a) => a.status !== "accepted").length;
    const matchesCount = myApplications.filter((a) => a.status === "accepted").length;
    userStats = {
      myJobPostsCount: myPostsRes.count ?? 0,
      myApplicationsCount: appliedCount,
      myMatchesCount: matchesCount,
    };
  }

  const ads = await getActiveHomeAds();

  return (
    <>
      <HomeDashboard
        tenderCount={relatedOpenCount}
        tenderTodayCount={todayRelatedCount}
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
          tenders={tenders}
          relatedCount={relatedOpenCount}
          todayCount={todayRelatedCount}
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
