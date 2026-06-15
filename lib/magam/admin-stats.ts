import { labelFromDemandRegionKey } from "@/lib/demand/regions";
import type { RadarAdsAdminBundle } from "@/lib/demand/radar-ads-admin-load";
import {
  kstInclusiveUtcRange,
  parseStatsDateRange,
  type StatsDateRange,
} from "@/lib/demand/stats-date-range";
import { radarAdEventChannel } from "@/lib/magam/radar-ad-channel";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MagamStatsDateRange = StatsDateRange;

export { parseStatsDateRange as parseMagamStatsDateRange };

export type MagamUsageStats = {
  totalPosters: number;
  totalListings: number;
  openListings: number;
  consentUsers: number;
  postersInRange: number;
  listingsInRange: number;
};

export type MagamChannelAdTotals = {
  channel: "magam" | "web";
  label: string;
  impressions: number;
  clicks: number;
  uniqueVisitors: number;
  uniqueSessions: number;
  ctr: number | null;
};

export type MagamAdScreenRow = {
  pagePath: string;
  label: string;
  impressions: number;
  clicks: number;
};

export type MagamAdSlotPerformanceRow = {
  slotId: string;
  slotIndex: number;
  title: string;
  advertiserName: string | null;
  scope: "national" | "regional";
  regionLabel: string;
  channel: "magam" | "web";
  impressions: number;
  clicks: number;
  ctr: number | null;
};

export type MagamAdminStatsBundle = {
  range: MagamStatsDateRange;
  usage: MagamUsageStats;
  channelTotals: MagamChannelAdTotals[];
  magamScreens: MagamAdScreenRow[];
  slotRows: MagamAdSlotPerformanceRow[];
};

type EventRow = {
  slot_id: string;
  event_type: string;
  session_id: string | null;
  anon_visitor_id: string | null;
  page_path: string | null;
  meta: Record<string, unknown> | null;
};

function ctr(impressions: number, clicks: number): number | null {
  if (impressions <= 0) return null;
  return Math.round((clicks / impressions) * 10000) / 100;
}

function magamScreenLabel(pagePath: string): string {
  if (pagePath === "magam:home") return "내 공고";
  if (pagePath === "magam:compose") return "글쓰기";
  if (pagePath.startsWith("magam:listing/")) return "모집 안내·공유";
  return pagePath;
}

function slotMetaFromBundle(bundle: RadarAdsAdminBundle) {
  const map = new Map<
    string,
    {
      title: string;
      advertiserName: string | null;
      slotIndex: number;
      scope: "national" | "regional";
      regionLabel: string;
    }
  >();

  const addBanner = (
    banner: { id: string; scope: string; region_key: string | null },
    slots: { id: string; title: string; advertiser_name: string | null; slot_index: number }[]
  ) => {
    const scope = banner.scope as "national" | "regional";
    const regionLabel =
      scope === "national"
        ? "전국"
        : banner.region_key
          ? labelFromDemandRegionKey(banner.region_key)
          : "지역";
    for (const slot of slots) {
      map.set(slot.id, {
        title: slot.title,
        advertiserName: slot.advertiser_name,
        slotIndex: slot.slot_index,
        scope,
        regionLabel,
      });
    }
  };

  if (bundle.nationalBanner) {
    addBanner(bundle.nationalBanner, bundle.nationalSlots);
  }
  for (const banner of bundle.regionalBanners) {
    addBanner(banner, bundle.regionalSlotsByBannerId[banner.id] ?? []);
  }

  return map;
}

export async function loadMagamAdminStats(
  supabase: SupabaseClient,
  range: MagamStatsDateRange,
  bundle: RadarAdsAdminBundle
): Promise<MagamAdminStatsBundle> {
  const [startUtc, endExclusiveUtc] = kstInclusiveUtcRange(range.from, range.to);

  const [
    listingsRes,
    listingsRangeRes,
    consentRes,
    eventsRes,
  ] = await Promise.all([
    supabase.from("magam_listings").select("user_id, status"),
    supabase
      .from("magam_listings")
      .select("user_id")
      .gte("created_at", startUtc)
      .lt("created_at", endExclusiveUtc),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("magam_sync_consent_at", "is", null),
    supabase
      .from("radar_ad_events")
      .select("slot_id, event_type, session_id, anon_visitor_id, page_path, meta")
      .gte("created_at", startUtc)
      .lt("created_at", endExclusiveUtc),
  ]);

  const listings = listingsRes.data ?? [];
  const posters = new Set(listings.map((r) => r.user_id as string));
  const rangeRows = listingsRangeRes.data ?? [];
  const rangePosters = new Set(rangeRows.map((r) => r.user_id as string));

  const usage: MagamUsageStats = {
    totalPosters: posters.size,
    totalListings: listings.length,
    openListings: listings.filter((r) => r.status === "open").length,
    consentUsers: consentRes.count ?? 0,
    postersInRange: rangePosters.size,
    listingsInRange: rangeRows.length,
  };

  const events = (eventsRes.data ?? []) as EventRow[];
  const slotMeta = slotMetaFromBundle(bundle);

  const channelAgg = {
    magam: {
      impressions: 0,
      clicks: 0,
      visitors: new Set<string>(),
      sessions: new Set<string>(),
    },
    web: {
      impressions: 0,
      clicks: 0,
      visitors: new Set<string>(),
      sessions: new Set<string>(),
    },
  };

  const screenAgg = new Map<string, { impressions: number; clicks: number }>();
  const slotAgg = new Map<
    string,
    { magam: { imp: number; clk: number }; web: { imp: number; clk: number } }
  >();

  for (const e of events) {
    const channel = radarAdEventChannel(e);
    const bucket = channelAgg[channel];
    const isClick = e.event_type === "click" || e.event_type === "phone_click";
    const isImp = e.event_type === "impression";

    if (isImp) {
      bucket.impressions += 1;
      if (e.anon_visitor_id) bucket.visitors.add(e.anon_visitor_id);
      if (e.session_id) bucket.sessions.add(e.session_id);
    }
    if (isClick) bucket.clicks += 1;

    if (channel === "magam" && e.page_path) {
      const screen = screenAgg.get(e.page_path) ?? { impressions: 0, clicks: 0 };
      if (isImp) screen.impressions += 1;
      if (isClick) screen.clicks += 1;
      screenAgg.set(e.page_path, screen);
    }

    const slot = slotAgg.get(e.slot_id) ?? {
      magam: { imp: 0, clk: 0 },
      web: { imp: 0, clk: 0 },
    };
    if (isImp) slot[channel].imp += 1;
    if (isClick) slot[channel].clk += 1;
    slotAgg.set(e.slot_id, slot);
  }

  const channelTotals: MagamChannelAdTotals[] = (["magam", "web"] as const).map((channel) => {
    const b = channelAgg[channel];
    return {
      channel,
      label: channel === "magam" ? "마감앱" : "클린아이덱스 웹",
      impressions: b.impressions,
      clicks: b.clicks,
      uniqueVisitors: b.visitors.size,
      uniqueSessions: b.sessions.size,
      ctr: ctr(b.impressions, b.clicks),
    };
  });

  const magamScreens: MagamAdScreenRow[] = [...screenAgg.entries()]
    .map(([pagePath, v]) => ({
      pagePath,
      label: magamScreenLabel(pagePath),
      impressions: v.impressions,
      clicks: v.clicks,
    }))
    .sort((a, b) => b.impressions - a.impressions);

  const slotRows: MagamAdSlotPerformanceRow[] = [];
  for (const [slotId, counts] of slotAgg.entries()) {
    const meta = slotMeta.get(slotId);
    for (const channel of ["magam", "web"] as const) {
      const imp = counts[channel].imp;
      const clk = counts[channel].clk;
      if (imp === 0 && clk === 0) continue;
      slotRows.push({
        slotId,
        slotIndex: meta?.slotIndex ?? 0,
        title: meta?.title ?? "(삭제된 슬롯)",
        advertiserName: meta?.advertiserName ?? null,
        scope: meta?.scope ?? "national",
        regionLabel: meta?.regionLabel ?? "—",
        channel,
        impressions: imp,
        clicks: clk,
        ctr: ctr(imp, clk),
      });
    }
  }

  slotRows.sort((a, b) => {
    if (a.channel !== b.channel) return a.channel === "magam" ? -1 : 1;
    return b.impressions - a.impressions;
  });

  return {
    range,
    usage,
    channelTotals,
    magamScreens,
    slotRows,
  };
}
