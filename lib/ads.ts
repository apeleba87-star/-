/**
 * 광고 슬롯 통합: 직접 수주 / 구글 / 쿠팡. 슬롯별 on/off, 직접 수주는 기간 내 캠페인 1건, 구글/쿠팡은 스크립트 삽입.
 */

import { createClient } from "@/lib/supabase-server";

export type HomeAdSlotKey =
  | "premium_banner"
  | "native_card"
  | "home_bottom"
  | "post_top"
  | "post_bottom"
  | "tenders_top"
  | "tenders_mid"
  | "listings_top"
  | "jobs_top";

export type AdSlotType = "direct" | "google" | "coupang";

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
  slot_type: AdSlotType;
  script_content: string | null;
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
    .select("id, key, name, enabled, slot_type, script_content")
    .in("key", slotKeys);

  if (!slots?.length) return result;

  for (const slot of slots) {
    const key = slot.key as string;
    const slotType = (slot.slot_type as AdSlotType) || "direct";
    const item: HomeAdSlotWithCampaign = {
      key,
      name: slot.name ?? "",
      enabled: !!slot.enabled,
      slot_type: slotType,
      script_content: slot.script_content ?? null,
      campaign: null,
    };

    if (slot.enabled && slot.id && slotType === "direct") {
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

/** 슬롯별 enabled 여부 + 직접 수주 캠페인 1건 또는 스크립트(구글/쿠팡) */
export async function getActiveHomeAds(): Promise<{
  premium_banner: HomeAdSlotWithCampaign | null;
  native_card: HomeAdSlotWithCampaign | null;
  home_bottom: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, ["premium_banner", "native_card", "home_bottom"]);
  return {
    premium_banner: map.premium_banner ?? null,
    native_card: map.native_card ?? null,
    home_bottom: map.home_bottom ?? null,
  };
}

/** 글 상세 페이지용: 상단·하단 슬롯 */
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

/** 입찰 목록 페이지용 */
export async function getActiveTendersAds(): Promise<{
  tenders_top: HomeAdSlotWithCampaign | null;
  tenders_mid: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, ["tenders_top", "tenders_mid"]);
  return {
    tenders_top: map.tenders_top ?? null,
    tenders_mid: map.tenders_mid ?? null,
  };
}

/** 현장 거래 목록 페이지용 */
export async function getActiveListingsAds(): Promise<{
  listings_top: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, ["listings_top"]);
  return { listings_top: map.listings_top ?? null };
}

/** 구인 목록 페이지용 */
export async function getActiveJobsAds(): Promise<{
  jobs_top: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, ["jobs_top"]);
  return { jobs_top: map.jobs_top ?? null };
}

/** 키 목록으로 슬롯 데이터 조회 (어디서든 사용) */
export async function getActiveAdsByKeys(
  keys: HomeAdSlotKey[]
): Promise<Record<string, HomeAdSlotWithCampaign | null>> {
  const supabase = createClient();
  return getActiveAdsForSlotKeys(supabase, keys);
}
