import { labelFromDemandRegionKey } from "@/lib/demand/regions";
import type { RadarAdAdminBanner, RadarAdAdminSlot, RadarAdsAdminBundle } from "@/lib/demand/radar-ads-admin-load";
import { isStaleActiveRadarSlot } from "@/lib/demand/radar-ad-slot-lifecycle";
import {
  countLiveRadarSlots,
  countOpenRadarSlots,
  formatRadarAdRegionShortLabel,
  formatRegionWithLiveCount,
  isRadarSlotExpiringSoon,
  isRadarSlotLive,
  RADAR_AD_SLOTS_PER_BANNER,
  radarSlotDaysLeft,
} from "@/lib/demand/radar-ads-slot";

export type ExpiringRadarAdItem = {
  bannerId: string;
  scope: "national" | "regional";
  regionKey: string | null;
  regionLabel: string;
  slotIndex: number;
  slotId: string;
  title: string;
  advertiserName: string | null;
  endDate: string;
  daysLeft: number;
};

export type RegionalFillItem = {
  bannerId: string;
  regionKey: string;
  regionLabel: string;
  regionLabelShort: string;
  liveCount: number;
  openCount: number;
  enabled: boolean;
};

export type StaleActiveRadarAdItem = ExpiringRadarAdItem;

export type RadarAdsDashboardStats = {
  today: string;
  expiringSoon: ExpiringRadarAdItem[];
  staleActive: StaleActiveRadarAdItem[];
  fullRegions: RegionalFillItem[];
  openRegions: RegionalFillItem[];
  nationalLiveCount: number;
  nationalOpenCount: number;
};

function bannerLabel(banner: RadarAdAdminBanner): string {
  if (banner.scope === "national") return "전국 (배너 A)";
  return banner.region_key ? labelFromDemandRegionKey(banner.region_key) : "지역 미지정";
}

function collectStaleActive(
  banner: RadarAdAdminBanner,
  slots: RadarAdAdminSlot[],
  today: string
): StaleActiveRadarAdItem[] {
  const regionLabel = bannerLabel(banner);
  return slots
    .filter((s) => isStaleActiveRadarSlot(s, today))
    .map((s) => ({
      bannerId: banner.id,
      scope: banner.scope as "national" | "regional",
      regionKey: banner.region_key,
      regionLabel,
      slotIndex: s.slot_index,
      slotId: s.id,
      title: s.title,
      advertiserName: s.advertiser_name,
      endDate: s.end_date,
      daysLeft: radarSlotDaysLeft(s.end_date, today),
    }))
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function collectExpiring(
  banner: RadarAdAdminBanner,
  slots: RadarAdAdminSlot[],
  today: string
): ExpiringRadarAdItem[] {
  const regionLabel = bannerLabel(banner);
  return slots
    .filter((s) => isRadarSlotExpiringSoon(s, today))
    .map((s) => ({
      bannerId: banner.id,
      scope: banner.scope as "national" | "regional",
      regionKey: banner.region_key,
      regionLabel,
      slotIndex: s.slot_index,
      slotId: s.id,
      title: s.title,
      advertiserName: s.advertiser_name,
      endDate: s.end_date,
      daysLeft: radarSlotDaysLeft(s.end_date, today),
    }))
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function toRegionalFillItem(
  banner: RadarAdAdminBanner,
  slots: RadarAdAdminSlot[],
  today: string
): RegionalFillItem | null {
  if (!banner.region_key) return null;
  const liveCount = countLiveRadarSlots(slots, today);
  const openCount = countOpenRadarSlots(slots, today);
  const regionLabel = labelFromDemandRegionKey(banner.region_key);
  return {
    bannerId: banner.id,
    regionKey: banner.region_key,
    regionLabel,
    regionLabelShort: formatRadarAdRegionShortLabel(banner.region_key),
    liveCount,
    openCount,
    enabled: banner.enabled,
  };
}

export function buildRadarAdsDashboardStats(bundle: RadarAdsAdminBundle): RadarAdsDashboardStats {
  const { today, nationalBanner, nationalSlots, regionalBanners, regionalSlotsByBannerId } =
    bundle;

  const expiringSoon: ExpiringRadarAdItem[] = [];
  const staleActive: StaleActiveRadarAdItem[] = [];
  if (nationalBanner) {
    expiringSoon.push(...collectExpiring(nationalBanner, nationalSlots, today));
    staleActive.push(...collectStaleActive(nationalBanner, nationalSlots, today));
  }
  for (const b of regionalBanners) {
    const slots = regionalSlotsByBannerId[b.id] ?? [];
    expiringSoon.push(...collectExpiring(b, slots, today));
    staleActive.push(...collectStaleActive(b, slots, today));
  }
  expiringSoon.sort((a, b) => a.endDate.localeCompare(b.endDate));
  staleActive.sort((a, b) => a.endDate.localeCompare(b.endDate));

  const regionalItems = regionalBanners
    .map((b) => toRegionalFillItem(b, regionalSlotsByBannerId[b.id] ?? [], today))
    .filter((x): x is RegionalFillItem => x != null);

  const fullRegions = regionalItems
    .filter((r) => r.liveCount >= RADAR_AD_SLOTS_PER_BANNER)
    .sort((a, b) => a.regionLabelShort.localeCompare(b.regionLabelShort, "ko"));

  const openRegions = regionalItems
    .filter((r) => r.liveCount < RADAR_AD_SLOTS_PER_BANNER)
    .sort((a, b) => a.liveCount - b.liveCount || a.regionLabelShort.localeCompare(b.regionLabelShort, "ko"));

  return {
    today,
    expiringSoon,
    staleActive,
    fullRegions,
    openRegions,
    nationalLiveCount: nationalBanner ? countLiveRadarSlots(nationalSlots, today) : 0,
    nationalOpenCount: nationalBanner ? countOpenRadarSlots(nationalSlots, today) : 0,
  };
}

export { countLiveRadarSlots, formatRadarAdRegionShortLabel, formatRegionWithLiveCount, isRadarSlotLive };
