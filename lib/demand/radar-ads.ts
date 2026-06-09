import { getKstTodayString } from "@/lib/jobs/kst-date";
import { createClient } from "@/lib/supabase-server";
import { labelFromDemandRegionKey } from "@/lib/demand/regions";
import { isRadarSlotLive } from "@/lib/demand/radar-ads-slot";
import { cropFromRow } from "@/lib/demand/radar-ad-image-crop";
import { clampRadarAdCopy } from "@/lib/demand/radar-ads-shared";
import type {
  RadarAdBannerPayload,
  RadarAdScope,
  RadarAdSlot,
  RadarAdSlotCategory,
} from "@/lib/demand/radar-ads-shared";

export type {
  RadarAdBannerPayload,
  RadarAdScope,
  RadarAdSlot,
  RadarAdSlotCategory,
  RadarAdSlotStatus,
} from "@/lib/demand/radar-ads-shared";

export { RADAR_AD_IMAGE_SPEC, RADAR_AD_SLOT_CATEGORY_LABELS } from "@/lib/demand/radar-ads-shared";

type BannerRow = {
  id: string;
  scope: string;
  region_key: string | null;
  enabled: boolean;
  rotation_seconds: number;
};

type SlotRow = {
  id: string;
  banner_id: string;
  slot_index: number;
  category: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_crop_x: number;
  image_crop_y: number;
  image_crop_w: number;
  image_crop_h: number;
  cta_text: string;
  cta_url: string;
  advertiser_name: string | null;
  start_date: string;
  end_date: string;
  status: string;
};

function mapSlot(row: SlotRow): RadarAdSlot {
  return {
    id: row.id,
    slotIndex: row.slot_index,
    category: row.category as RadarAdSlotCategory,
    title: clampRadarAdCopy("title", row.title),
    description: row.description
      ? clampRadarAdCopy("description", row.description)
      : null,
    imageUrl: row.image_url,
    imageCrop: cropFromRow(row),
    ctaText: clampRadarAdCopy("ctaText", row.cta_text),
    ctaUrl: row.cta_url,
    advertiserName: row.advertiser_name
      ? clampRadarAdCopy("advertiserName", row.advertiser_name)
      : null,
  };
}

async function loadBannerWithSlots(
  scope: RadarAdScope,
  regionKey: string | null
): Promise<RadarAdBannerPayload | null> {
  const supabase = createClient();
  const today = getKstTodayString();

  let query = supabase
    .from("radar_ad_banners")
    .select("id, scope, region_key, enabled, rotation_seconds")
    .eq("scope", scope)
    .eq("enabled", true);

  if (scope === "national") {
    query = query.is("region_key", null);
  } else if (regionKey) {
    query = query.eq("region_key", regionKey);
  } else {
    return null;
  }

  const { data: bannerRows } = await query.limit(1);
  const banner = (bannerRows?.[0] ?? null) as BannerRow | null;
  if (!banner) return null;

  const { data: slotRows } = await supabase
    .from("radar_ad_slots")
    .select(
      "id, banner_id, slot_index, category, title, description, image_url, image_crop_x, image_crop_y, image_crop_w, image_crop_h, cta_text, cta_url, advertiser_name, start_date, end_date, status"
    )
    .eq("banner_id", banner.id)
    .order("slot_index", { ascending: true });

  const slots = ((slotRows ?? []) as SlotRow[])
    .filter((r) => isRadarSlotLive(r, today))
    .map(mapSlot);

  if (slots.length === 0) return null;

  return {
    scope,
    regionKey: banner.region_key,
    regionLabel:
      scope === "national"
        ? "전국"
        : banner.region_key
          ? labelFromDemandRegionKey(banner.region_key)
          : null,
    rotationSeconds: banner.rotation_seconds,
    slots,
  };
}

export async function getRadarNationalAdBanner(): Promise<RadarAdBannerPayload | null> {
  return loadBannerWithSlots("national", null);
}

export async function getRadarRegionalAdBanner(
  regionKey: string
): Promise<RadarAdBannerPayload | null> {
  const direct = await loadBannerWithSlots("regional", regionKey);
  if (direct) return direct;

  if (regionKey.startsWith("district:")) {
    const rest = regionKey.slice("district:".length);
    const colon = rest.indexOf(":");
    if (colon > 0) {
      const cityId = rest.slice(0, colon);
      const cityBanner = await loadBannerWithSlots("regional", `city:${cityId}`);
      if (cityBanner) return cityBanner;
    }
  }

  return null;
}
