import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { getActiveHomeAds } from "@/lib/ads";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import { formatDataSyncedLabel } from "@/lib/home/home-spotlight";
import {
  parsePostsPreviewJson,
  parseRecentTendersJson,
  parseSpotlightJson,
} from "@/lib/home/home-page-snapshot";
import HomeCleanIndexHero from "@/components/home/HomeCleanIndexHero";
import HomeLandingSection from "@/components/home/HomeLandingSection";
import HomeValuePropositionGrid from "@/components/home/HomeValuePropositionGrid";
import HomeTrustStrip from "@/components/home/HomeTrustStrip";
import HomeBottomCta from "@/components/home/HomeBottomCta";
import TenderSection from "@/components/home/TenderSection";
import NewsSection from "@/components/home/NewsSection";
import DataInsightSection from "@/components/home/DataInsightSection";
import { HOME_LANDING } from "@/lib/copy/home-landing";

/**
 * 홈: 집계·스냅샷 테이블만 읽음. 입찰 JSON은 G2B 크론, 뉴스 미리보기는 G2B/refresh-dashboard/generate-content가 갱신.
 * 긴 ISR + 크론의 revalidatePath("/")로 사용자 요청당 DB 부하 최소화.
 */
export const revalidate = 86400;

export default async function HomePage() {
  const supabase = createClient();
  const authSupabase = await createServerSupabase();

  const [jobPostStatsRow, listingStatsRow, homeTenderStatsRow, homeContentRow, userRes, ads] =
    await Promise.all([
      supabase.from("job_post_stats").select("open_count").maybeSingle(),
      supabase.from("listing_stats").select("total_count").maybeSingle(),
      supabase
        .from("home_tender_stats")
        .select(
          "open_count, today_count, industry_breakdown, recent_tender_ids, updated_at, spotlight_json, recent_tenders_json",
        )
        .maybeSingle(),
      supabase.from("home_content_stats").select("posts_today_count, posts_preview").maybeSingle(),
      authSupabase.auth.getUser(),
      getActiveHomeAds(),
    ]);

  const homeTenderStats = homeTenderStatsRow.data;
  const homeContent = homeContentRow.data;

  const industryBreakdown = (Array.isArray(homeTenderStats?.industry_breakdown)
    ? homeTenderStats.industry_breakdown
    : []) as { industry_code: string; industry_name: string; count: number }[];

  const tenderCount = homeTenderStats?.open_count ?? 0;
  const tenderTodayCount = homeTenderStats?.today_count ?? 0;
  const recentTenders = parseRecentTendersJson(homeTenderStats?.recent_tenders_json);
  const spotlightTender = parseSpotlightJson(homeTenderStats?.spotlight_json);

  const newsCount = homeContent?.posts_today_count ?? 0;
  const news = parsePostsPreviewJson(homeContent?.posts_preview);

  const listingsCount = listingStatsRow.data?.total_count ?? 0;
  const jobsOpenCount = jobPostStatsRow.data?.open_count ?? 0;
  const user = userRes.data.user;

  const tenderSyncedLabel = formatDataSyncedLabel(homeTenderStats?.updated_at ?? null);

  const tenderStats = {
    tenderCount,
    tenderTodayCount,
    topIndustry: null as { code: string; name: string; count: number } | null,
    industryBreakdown,
    recentTenders,
  };

  return (
    <div className="min-h-screen bg-zinc-100 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(120,113,198,0.08),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(14,165,233,0.05),transparent_45%)]">
      <div className="page-shell py-6 sm:py-10 lg:py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 sm:max-w-4xl sm:gap-12 lg:gap-14 xl:max-w-5xl 2xl:max-w-6xl">
          <HomeCleanIndexHero
            tender={spotlightTender}
            syncedLabel={tenderSyncedLabel}
            isLoggedIn={!!user}
          />

          <HomeLandingSection
            id="services"
            title={HOME_LANDING.valueTitle}
            subtitle={HOME_LANDING.valueSubtitle}
          >
            <HomeValuePropositionGrid isLoggedIn={!!user} />
            <div className="mt-8 sm:mt-10">
              <HomeTrustStrip
                tenderCount={tenderStats.tenderCount}
                tenderTodayCount={tenderStats.tenderTodayCount}
                newsCount={newsCount}
                listingsCount={listingsCount}
                jobsOpenCount={jobsOpenCount}
                syncedLabel={tenderSyncedLabel}
              />
            </div>
          </HomeLandingSection>

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
            <div>
              <AdSlotRenderer slot={ads.home_bottom} variant="card" />
            </div>
          ) : null}

          <DataInsightSection />
          <HomeBottomCta isLoggedIn={!!user} />
        </div>
      </div>
    </div>
  );
}
