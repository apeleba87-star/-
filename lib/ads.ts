/**
 * 홈 광고: 슬롯 on/off + 기간 내 캠페인 1건 조회
 */

import { createClient } from "@/lib/supabase-server";

export type HomeAdSlotKey = "premium_banner" | "native_card";

export type HomeAdCampaign = {
  id: string;
  home_ad_slot_id: string;
  title: string | null;
  description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  sort_order: number;
};

export type HomeAdSlotWithCampaign = {
  key: HomeAdSlotKey;
  name: string;
  enabled: boolean;
  campaign: HomeAdCampaign | null;
};

const TODAY = new Date().toISOString().slice(0, 10);

/** 슬롯별 enabled 여부 + 현재 진행중 캠페인 1건 (기간·sort_order 적용) */
export async function getActiveHomeAds(): Promise<{
  premium_banner: HomeAdSlotWithCampaign | null;
  native_card: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();

  const { data: slots } = await supabase
    .from("home_ad_slots")
    .select("id, key, name, enabled")
    .in("key", ["premium_banner", "native_card"]);

  const result: {
    premium_banner: HomeAdSlotWithCampaign | null;
    native_card: HomeAdSlotWithCampaign | null;
  } = { premium_banner: null, native_card: null };

  if (!slots?.length) return result;

  for (const slot of slots) {
    const key = slot.key as HomeAdSlotKey;
    const item: HomeAdSlotWithCampaign = {
      key,
      name: slot.name ?? "",
      enabled: !!slot.enabled,
      campaign: null,
    };

    if (slot.enabled && slot.id) {
      const { data: campaigns } = await supabase
        .from("home_ad_campaigns")
        .select("id, home_ad_slot_id, title, description, cta_text, cta_url, image_url, start_date, end_date, sort_order")
        .eq("home_ad_slot_id", slot.id)
        .lte("start_date", TODAY)
        .gte("end_date", TODAY)
        .order("sort_order", { ascending: true })
        .limit(1);

      if (campaigns?.[0]) item.campaign = campaigns[0] as HomeAdCampaign;
    }

    result[key] = item;
  }

  return result;
}
