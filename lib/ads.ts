/**
 * 광고 슬롯 서버 조회 (Supabase). 타입·유틸은 @/lib/ads-shared 사용.
 */

import { createClient } from "@/lib/supabase-server";
import type {
  AdSlotType,
  CoupangBannerProduct,
  HomeAdCampaign,
  HomeAdSlotKey,
  HomeAdSlotWithCampaign,
} from "@/lib/ads-shared";

export type {
  AdSlotType,
  CoupangBannerProduct,
  HomeAdCampaign,
  HomeAdSlotKey,
  HomeAdSlotWithCampaign,
} from "@/lib/ads-shared";

export { isAdSlotRenderable } from "@/lib/ads-shared";

const TODAY = new Date().toISOString().slice(0, 10);

type SlotRow = {
  id: string;
  key: string;
  name: string | null;
  enabled: boolean;
  slot_type: string | null;
  script_content: string | null;
  fallback_type: string | null;
  fallback_script_content: string | null;
};

function applyFallback(
  item: HomeAdSlotWithCampaign,
  row: SlotRow,
  primaryType: AdSlotType
): HomeAdSlotWithCampaign {
  if (
    primaryType === "direct" &&
    !item.campaign &&
    row.fallback_type &&
    (row.fallback_type === "google" || row.fallback_type === "coupang") &&
    row.fallback_script_content?.trim()
  ) {
    return {
      ...item,
      slot_type: row.fallback_type as AdSlotType,
      script_content: row.fallback_script_content.trim(),
    };
  }
  return item;
}

async function getActiveAdsForSlotKeys(
  supabase: ReturnType<typeof createClient>,
  slotKeys: string[]
): Promise<Record<string, HomeAdSlotWithCampaign | null>> {
  const result: Record<string, HomeAdSlotWithCampaign | null> = {};
  for (const k of slotKeys) result[k] = null;

  const { data: slots } = await supabase
    .from("home_ad_slots")
    .select(
      "id, key, name, enabled, slot_type, script_content, fallback_type, fallback_script_content"
    )
    .in("key", slotKeys);

  if (!slots?.length) return result;

  const coupangApiKeys: string[] = [];

  for (const slot of slots as SlotRow[]) {
    const key = slot.key as string;
    const primaryType = (slot.slot_type as AdSlotType) || "direct";
    let item: HomeAdSlotWithCampaign = {
      key,
      name: slot.name ?? "",
      enabled: !!slot.enabled,
      slot_type: primaryType,
      script_content: slot.script_content ?? null,
      campaign: null,
    };

    if (primaryType === "coupang_api" && slot.enabled) {
      coupangApiKeys.push(key);
    }

    if (slot.enabled && slot.id && primaryType === "direct") {
      const { data: campaigns } = await supabase
        .from("home_ad_campaigns")
        .select(
          "id, home_ad_slot_id, title, description, cta_text, cta_url, image_url, start_date, end_date, sort_order"
        )
        .eq("home_ad_slot_id", slot.id)
        .lte("start_date", TODAY)
        .gte("end_date", TODAY)
        .order("sort_order", { ascending: true })
        .limit(1);

      if (campaigns?.[0]) item.campaign = campaigns[0] as HomeAdCampaign;
    }

    if (slot.enabled) {
      item = applyFallback(item, slot, primaryType);
    }

    result[key] = item;
  }

  if (coupangApiKeys.length > 0) {
    const { data: caches } = await supabase
      .from("coupang_ad_cache")
      .select("slot_key, products, fetch_error")
      .in("slot_key", coupangApiKeys);

    for (const row of caches ?? []) {
      const cacheKey = String((row as { slot_key: string }).slot_key);
      const existing = result[cacheKey];
      if (!existing) continue;
      const products = (row as { products?: unknown }).products;
      result[cacheKey] = {
        ...existing,
        coupang_products: Array.isArray(products) ? (products as CoupangBannerProduct[]) : [],
        coupang_fetch_error: (row as { fetch_error?: string | null }).fetch_error ?? null,
      };
    }
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

/** 낙찰 목록 페이지용 */
export async function getActiveTenderAwardsAds(): Promise<{
  awards_top: HomeAdSlotWithCampaign | null;
  awards_mid: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, ["awards_top", "awards_mid"]);
  return {
    awards_top: map.awards_top ?? null,
    awards_mid: map.awards_mid ?? null,
  };
}

/** 입찰 상세 페이지용 */
export async function getActiveTenderDetailAds(): Promise<{
  tender_detail_top: HomeAdSlotWithCampaign | null;
  tender_detail_bottom: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, ["tender_detail_top", "tender_detail_bottom"]);
  return {
    tender_detail_top: map.tender_detail_top ?? null,
    tender_detail_bottom: map.tender_detail_bottom ?? null,
  };
}

/** 일당·마케팅 리포트 페이지용 */
export async function getActiveReportPageAds(): Promise<{
  report_top: HomeAdSlotWithCampaign | null;
  report_bottom: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, ["report_top", "report_bottom"]);
  return {
    report_top: map.report_top ?? null,
    report_bottom: map.report_bottom ?? null,
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
