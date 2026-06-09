import { getKstTodayString } from "@/lib/jobs/kst-date";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RadarAdAdminBanner = {
  id: string;
  scope: string;
  region_key: string | null;
  enabled: boolean;
  rotation_seconds: number;
};

export type RadarAdAdminSlot = {
  id: string;
  banner_id: string;
  slot_index: number;
  category: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_text: string;
  cta_url: string;
  advertiser_name: string | null;
  monthly_fee: number | null;
  memo: string | null;
  start_date: string;
  end_date: string;
  status: string;
  image_crop_x: number;
  image_crop_y: number;
  image_crop_w: number;
  image_crop_h: number;
};

export type RadarAdsAdminBundle = {
  today: string;
  nationalBanner: RadarAdAdminBanner | null;
  nationalSlots: RadarAdAdminSlot[];
  regionalBanners: RadarAdAdminBanner[];
  regionalSlotsByBannerId: Record<string, RadarAdAdminSlot[]>;
};

export async function loadRadarAdsAdminBundle(
  supabase: SupabaseClient
): Promise<RadarAdsAdminBundle> {
  const today = getKstTodayString();

  const { data: banners } = await supabase
    .from("radar_ad_banners")
    .select("id, scope, region_key, enabled, rotation_seconds")
    .order("scope")
    .order("region_key");

  const bannerList = (banners ?? []) as RadarAdAdminBanner[];
  const nationalBanner = bannerList.find((b) => b.scope === "national") ?? null;
  const regionalBanners = bannerList.filter((b) => b.scope === "regional");
  const bannerIds = bannerList.map((b) => b.id);

  const { data: slots } =
    bannerIds.length > 0
      ? await supabase
          .from("radar_ad_slots")
          .select(
            "id, banner_id, slot_index, category, title, description, image_url, image_crop_x, image_crop_y, image_crop_w, image_crop_h, cta_text, cta_url, advertiser_name, monthly_fee, memo, start_date, end_date, status"
          )
          .in("banner_id", bannerIds)
          .order("slot_index")
      : { data: [] };

  const allSlots = (slots ?? []) as RadarAdAdminSlot[];
  const nationalSlots = nationalBanner
    ? allSlots.filter((s) => s.banner_id === nationalBanner.id)
    : [];
  const regionalSlotsByBannerId: Record<string, RadarAdAdminSlot[]> = {};
  for (const b of regionalBanners) {
    regionalSlotsByBannerId[b.id] = allSlots.filter((s) => s.banner_id === b.id);
  }

  return {
    today,
    nationalBanner,
    nationalSlots,
    regionalBanners,
    regionalSlotsByBannerId,
  };
}
