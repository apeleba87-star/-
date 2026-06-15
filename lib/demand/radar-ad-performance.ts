import { labelFromDemandRegionKey } from "@/lib/demand/regions";
import type { StatsDateRange } from "@/lib/demand/stats-date-range";
import { kstInclusiveUtcRange } from "@/lib/demand/stats-date-range";
import type { RadarAdAdminBanner, RadarAdAdminSlot, RadarAdsAdminBundle } from "@/lib/demand/radar-ads-admin-load";
import { isRadarSlotLive } from "@/lib/demand/radar-ads-slot";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import { isMagamRadarAdEvent } from "@/lib/magam/radar-ad-channel";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RadarAdSlotPerformanceRow = {
  slotId: string;
  slotIndex: number;
  bannerId: string;
  scope: "national" | "regional";
  regionLabel: string;
  title: string;
  advertiserName: string | null;
  isLive: boolean;
  impressionsRaw: number;
  impressionsMagam: number;
  impressionsWeb: number;
  impressionsUnique: number;
  clicksRaw: number;
  clicksMagam: number;
  clicksWeb: number;
  ctr: number | null;
};

type EventRow = {
  slot_id: string;
  event_type: string;
  session_id: string | null;
  anon_visitor_id: string | null;
  page_path: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function bannerRegionLabel(banner: RadarAdAdminBanner): string {
  if (banner.scope === "national") return "전국 제휴";
  return banner.region_key ? labelFromDemandRegionKey(banner.region_key) : "지역 미지정";
}

function ctr(impressions: number, clicks: number): number | null {
  if (impressions <= 0) return null;
  return Math.round((clicks / impressions) * 10000) / 100;
}

function aggregateEvents(
  events: EventRow[],
  slotId: string
): {
  impressionsRaw: number;
  impressionsMagam: number;
  impressionsWeb: number;
  impressionsUnique: number;
  clicksRaw: number;
  clicksMagam: number;
  clicksWeb: number;
} {
  const filtered = events.filter((e) => e.slot_id === slotId);
  const impressions = filtered.filter((e) => e.event_type === "impression");
  const clicks = filtered.filter(
    (e) => e.event_type === "click" || e.event_type === "phone_click"
  );
  const visitors = new Set(impressions.map((e) => e.anon_visitor_id).filter(Boolean));

  let impressionsMagam = 0;
  let impressionsWeb = 0;
  let clicksMagam = 0;
  let clicksWeb = 0;

  for (const e of impressions) {
    if (isMagamRadarAdEvent(e)) impressionsMagam += 1;
    else impressionsWeb += 1;
  }
  for (const e of clicks) {
    if (isMagamRadarAdEvent(e)) clicksMagam += 1;
    else clicksWeb += 1;
  }

  return {
    impressionsRaw: impressions.length,
    impressionsMagam,
    impressionsWeb,
    impressionsUnique: visitors.size,
    clicksRaw: clicks.length,
    clicksMagam,
    clicksWeb,
  };
}

export async function loadRadarAdPerformanceRows(
  supabase: SupabaseClient,
  bundle: RadarAdsAdminBundle,
  range: StatsDateRange
): Promise<RadarAdSlotPerformanceRow[]> {
  const [startUtc, endExclusiveUtc] = kstInclusiveUtcRange(range.from, range.to);

  const slotMeta: {
    slot: RadarAdAdminSlot;
    banner: RadarAdAdminBanner;
  }[] = [];

  if (bundle.nationalBanner) {
    for (const slot of bundle.nationalSlots) {
      slotMeta.push({ slot, banner: bundle.nationalBanner });
    }
  }
  for (const banner of bundle.regionalBanners) {
    for (const slot of bundle.regionalSlotsByBannerId[banner.id] ?? []) {
      slotMeta.push({ slot, banner });
    }
  }

  const slotIds = slotMeta.map((m) => m.slot.id);
  if (slotIds.length === 0) return [];

  const { data: events, error: eventsErr } = await supabase
    .from("radar_ad_events")
    .select(
      "slot_id, event_type, session_id, anon_visitor_id, page_path, meta, created_at"
    )
    .in("slot_id", slotIds)
    .gte("created_at", startUtc)
    .lt("created_at", endExclusiveUtc)
    .order("created_at", { ascending: false });

  if (eventsErr) {
    console.error("[radar-ad-performance] load events:", eventsErr.message);
  }

  const eventList = (events ?? []) as EventRow[];

  return slotMeta
    .map(({ slot, banner }) => {
      const agg = aggregateEvents(eventList, slot.id);
      const scope = banner.scope as "national" | "regional";

      return {
        slotId: slot.id,
        slotIndex: slot.slot_index,
        bannerId: banner.id,
        scope,
        regionLabel: bannerRegionLabel(banner),
        title: slot.title,
        advertiserName: slot.advertiser_name,
        isLive: isRadarSlotLive(slot, getKstTodayString()),
        impressionsRaw: agg.impressionsRaw,
        impressionsMagam: agg.impressionsMagam,
        impressionsWeb: agg.impressionsWeb,
        impressionsUnique: agg.impressionsUnique,
        clicksRaw: agg.clicksRaw,
        clicksMagam: agg.clicksMagam,
        clicksWeb: agg.clicksWeb,
        ctr: ctr(agg.impressionsRaw, agg.clicksRaw),
      };
    })
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return b.impressionsRaw - a.impressionsRaw;
    });
}
