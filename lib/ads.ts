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

/** 일간 입찰 리포트 본문 인라인 슬롯 (예산 상위 아래 · 프리미엄 당일 핵심 아래) */
export async function getActiveTenderReportInlineAds(): Promise<{
  tender_report_budget_below: HomeAdSlotWithCampaign | null;
  tender_report_premium_core_below: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "tender_report_budget_below",
    "tender_report_premium_core_below",
  ]);
  return {
    tender_report_budget_below: map.tender_report_budget_below ?? null,
    tender_report_premium_core_below: map.tender_report_premium_core_below ?? null,
  };
}

/** @deprecated getActiveTenderReportInlineAds 사용 */
export async function getActivePostDetailAds(): Promise<{
  tender_report_budget_below: HomeAdSlotWithCampaign | null;
  tender_report_premium_core_below: HomeAdSlotWithCampaign | null;
}> {
  return getActiveTenderReportInlineAds();
}

/** 키 목록으로 슬롯 데이터 조회 (관리자·이벤트용) */
export async function getActiveAdsByKeys(
  keys: HomeAdSlotKey[]
): Promise<Record<string, HomeAdSlotWithCampaign | null>> {
  const supabase = createClient();
  return getActiveAdsForSlotKeys(supabase, keys);
}
