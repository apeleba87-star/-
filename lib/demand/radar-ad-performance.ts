import { labelFromDemandRegionKey } from "@/lib/demand/regions";
import type { RadarAdAdminBanner, RadarAdAdminSlot, RadarAdsAdminBundle } from "@/lib/demand/radar-ads-admin-load";
import { isRadarSlotLive } from "@/lib/demand/radar-ads-slot";
import { addDaysToDateString, getKstTodayString } from "@/lib/jobs/kst-date";
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
  impressionsRaw7d: number;
  impressionsRaw30d: number;
  impressionsDeduped30d: number;
  impressionsUnique30d: number;
  clicksRaw30d: number;
  ctr30d: number | null;
};

type EventRow = {
  slot_id: string;
  event_type: string;
  session_id: string | null;
  anon_visitor_id: string | null;
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
  slotId: string,
  sinceIso: string
): {
  impressionsRaw: number;
  impressionsDeduped: number;
  impressionsUnique: number;
  clicksRaw: number;
} {
  const filtered = events.filter((e) => e.slot_id === slotId && e.created_at >= sinceIso);
  const impressions = filtered.filter((e) => e.event_type === "impression");
  const clicks = filtered.filter((e) => e.event_type === "click" || e.event_type === "phone_click");
  const sessions = new Set(impressions.map((e) => e.session_id).filter(Boolean));
  const visitors = new Set(impressions.map((e) => e.anon_visitor_id).filter(Boolean));

  return {
    impressionsRaw: impressions.length,
    impressionsDeduped: sessions.size,
    impressionsUnique: visitors.size,
    clicksRaw: clicks.length,
  };
}

export async function loadRadarAdPerformanceRows(
  supabase: SupabaseClient,
  bundle: RadarAdsAdminBundle
): Promise<RadarAdSlotPerformanceRow[]> {
  const today = bundle.today;
  const since30 = `${addDaysToDateString(today, -29)}T00:00:00+09:00`;
  const since7 = `${addDaysToDateString(today, -6)}T00:00:00+09:00`;

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
    .select("slot_id, event_type, session_id, anon_visitor_id, created_at")
    .in("slot_id", slotIds)
    .gte("created_at", since30)
    .order("created_at", { ascending: false });

  if (eventsErr) {
    console.error("[radar-ad-performance] load events:", eventsErr.message);
  }

  const eventList = (events ?? []) as EventRow[];

  return slotMeta
    .map(({ slot, banner }) => {
      const a30 = aggregateEvents(eventList, slot.id, since30);
      const a7 = aggregateEvents(eventList, slot.id, since7);
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
        impressionsRaw7d: a7.impressionsRaw,
        impressionsRaw30d: a30.impressionsRaw,
        impressionsDeduped30d: a30.impressionsDeduped,
        impressionsUnique30d: a30.impressionsUnique,
        clicksRaw30d: a30.clicksRaw,
        ctr30d: ctr(a30.impressionsRaw, a30.clicksRaw),
      };
    })
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return b.impressionsRaw30d - a.impressionsRaw30d;
    });
}
