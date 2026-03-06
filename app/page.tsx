import { createClient } from "@/lib/supabase-server";
import { getActiveHomeAds } from "@/lib/ads";
import HeroSection from "@/components/home/HeroSection";
import AdPremiumBanner from "@/components/home/AdPremiumBanner";
import TenderSection from "@/components/home/TenderSection";
import NewsSection from "@/components/home/NewsSection";
import AdNativeCard from "@/components/home/AdNativeCard";
import UgcSection from "@/components/home/UgcSection";
import DataInsightSection from "@/components/home/DataInsightSection";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const todayEnd = today + "T23:59:59.999Z";
  const now = new Date().toISOString();

  // 관련 = 청소·방역·소독 (cleaning + disinfection). 현재 접수 중 = 마감일 > 현재
  const [
    relatedOpenCountRes,
    todayRelatedCountRes,
    openTendersRes,
    newsCountRes,
    ugcCountRes,
    newsPostsRes,
    recentUgcRes,
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
      .select("id, bid_ntce_nm, ntce_instt_nm, bid_clse_dt, bsns_dstr_nm")
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
      .from("ugc")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("created_at", today)
      .lt("created_at", todayEnd),
    supabase
      .from("posts")
      .select("id, title, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(5),
    supabase
      .from("ugc")
      .select("id, type, scope, comment, region, price_per_pyeong, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const relatedOpenCount = relatedOpenCountRes.count ?? 0;
  const todayRelatedCount = todayRelatedCountRes.count ?? 0;
  const newsCount = newsCountRes.count ?? 0;
  const ugcCount = ugcCountRes.count ?? 0;
  const tenders = openTendersRes.data ?? [];
  const news = newsPostsRes.data ?? [];
  const ugcList = recentUgcRes.data ?? [];

  const ads = await getActiveHomeAds();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <HeroSection
        tenderRelatedCount={relatedOpenCount}
        tenderTodayCount={todayRelatedCount}
        newsCount={newsCount}
        ugcCount={ugcCount}
      />
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
      <UgcSection items={ugcList} />
      <DataInsightSection />
    </div>
  );
}
