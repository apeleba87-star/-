import { createServerSupabase } from "@/lib/supabase-server";
import { isCoupangPartnersConfigured } from "@/lib/coupang-partners/client";
import { parseCoupangSlotConfig } from "@/lib/coupang-partners/config";
import type { CoupangSlotConfig } from "@/lib/coupang-partners/types";
import HomeAdsManager from "./HomeAdsManager";
import AdDailyStatsTable from "./AdDailyStatsTable";

export default async function AdminAdsPage() {
  const supabase = await createServerSupabase();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fromDate = sevenDaysAgo.toISOString().slice(0, 10);

  const [{ data: slots }, { data: campaigns }, { data: dailyStats }, { data: caches }] = await Promise.all([
    supabase
      .from("home_ad_slots")
      .select(
        "id, key, name, enabled, slot_type, script_content, fallback_type, fallback_script_content, coupang_config"
      )
      .order("key"),
    supabase
      .from("home_ad_campaigns")
      .select("id, home_ad_slot_id, title, description, cta_text, cta_url, image_url, start_date, end_date, sort_order")
      .order("sort_order"),
    supabase
      .from("ad_daily_stats")
      .select("stats_date, campaign_id, slot_key, impressions_raw, impressions_deduped, clicks_raw, clicks_deduped")
      .gte("stats_date", fromDate)
      .order("stats_date", { ascending: false }),
    supabase.from("coupang_ad_cache").select("slot_key, products, fetch_error, fetched_at"),
  ]);

  const campaignTitles = new Map((campaigns ?? []).map((c) => [c.id, c.title ?? "(제목 없음)"]));

  const cacheByKey = Object.fromEntries(
    (caches ?? []).map((c) => {
      const row = c as { slot_key: string; products?: unknown[]; fetch_error?: string | null; fetched_at?: string };
      return [
        row.slot_key,
        {
          fetched_at: row.fetched_at ?? null,
          fetch_error: row.fetch_error ?? null,
          product_count: Array.isArray(row.products) ? row.products.length : 0,
        },
      ];
    })
  );

  const coupangConfigBySlotId: Record<string, CoupangSlotConfig | null> = {};
  for (const s of slots ?? []) {
    const row = s as { id: string; coupang_config?: unknown };
    coupangConfigBySlotId[row.id] = parseCoupangSlotConfig(row.coupang_config);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">광고 슬롯</h1>
      <p className="mb-6 text-sm text-slate-600">
        입찰·낙찰 목록·상세 광고 슬롯을 관리합니다.
      </p>
      <HomeAdsManager
        slots={slots ?? []}
        campaigns={campaigns ?? []}
        coupangCacheByKey={cacheByKey}
        coupangConfigBySlotId={coupangConfigBySlotId}
        coupangApiConfigured={isCoupangPartnersConfigured()}
      />

      <section className="mt-12">
        <h2 className="mb-2 text-lg font-bold text-slate-900">직접 수주 성과 (최근 7일)</h2>
        <p className="mb-4 text-xs text-slate-500">
          노출/클릭은 ad_events 수집 기준입니다. 일별 집계는 크론(refresh-ad-daily-stats)으로 갱신됩니다.
        </p>
        <AdDailyStatsTable rows={dailyStats ?? []} campaignTitles={campaignTitles} />
      </section>
    </div>
  );
}
