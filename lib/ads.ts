/**
 * 홈·글상세 광고: 슬롯 on/off + 기간 내 캠페인 1건 조회
 */

import { createClient } from "@/lib/supabase-server";

export type HomeAdSlotKey = "premium_banner" | "native_card" | "post_top" | "post_bottom";

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
  key: string;
  name: string;
  enabled: boolean;
  campaign: HomeAdCampaign | null;
};

const TODAY = new Date().toISOString().slice(0, 10);

async function getActiveAdsForSlotKeys(
  supabase: ReturnType<typeof createClient>,
  slotKeys: string[]
): Promise<Record<string, HomeAdSlotWithCampaign | null>> {
  const result: Record<string, HomeAdSlotWithCampaign | null> = {};
  for (const k of slotKeys) result[k] = null;

  const { data: slots } = await supabase
    .from("home_ad_slots")
    .select("id, key, name, enabled")
    .in("key", slotKeys);

  if (!slots?.length) return result;

  for (const slot of slots) {
    const key = slot.key as string;
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

/** 슬롯별 enabled 여부 + 현재 진행중 캠페인 1건 (기간·sort_order 적용) */
export async function getActiveHomeAds(): Promise<{
  premium_banner: HomeAdSlotWithCampaign | null;
  native_card: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, ["premium_banner", "native_card"]);
  return {
    premium_banner: map.premium_banner ?? null,
    native_card: map.native_card ?? null,
  };
}

/** 글 상세 페이지용: 상단·하단 슬롯 캠페인 조회 */
export async function getActivePostDetailAds(): Promise<{
  post_top: HomeAdSlotWithCampaign | null;
  post_bottom: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, ["post_top", "post_bottom"]);
  return {
    post_top: map.post_top ?? null,
    post_bottom: map.post_bottom ?? null,
  };
}
