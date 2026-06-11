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

/** 견적 계산기: 내 견적 분석하기 버튼 아래 */
export async function getActiveEstimateAnalyzeBelowAd(): Promise<HomeAdSlotWithCampaign | null> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "estimate_analyze_below",
    "tender_report_budget_below",
  ]);
  return applySlotScriptFallback(
    map.estimate_analyze_below ?? null,
    map.tender_report_budget_below ?? null
  );
}

/** 마케팅 리포트: 추천 제목 1번·2번 카드 사이 */
export async function getActiveMarketingReportSuggestedTitlesAd(): Promise<HomeAdSlotWithCampaign | null> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "marketing_report_suggested_titles_1_2",
    "tender_report_budget_below",
  ]);
  return applySlotScriptFallback(
    map.marketing_report_suggested_titles_1_2 ?? null,
    map.tender_report_budget_below ?? null
  );
}

/** 낙찰 리포트 본문 인라인 슬롯 */
export async function getActiveAwardReportInlineAds(): Promise<{
  award_report_key_metrics_below: HomeAdSlotWithCampaign | null;
  award_report_top_awards_above: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "award_report_key_metrics_below",
    "award_report_top_awards_above",
    "tender_report_budget_below",
  ]);
  const fallback = map.tender_report_budget_below ?? null;
  return {
    award_report_key_metrics_below: applySlotScriptFallback(
      map.award_report_key_metrics_below ?? null,
      fallback
    ),
    award_report_top_awards_above: applySlotScriptFallback(
      map.award_report_top_awards_above ?? null,
      fallback
    ),
  };
}

/** 일당·마케팅 리포트 페이지 상·하단 */
export async function getActiveReportPageAds(): Promise<{
  report_top: HomeAdSlotWithCampaign | null;
  report_bottom: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "report_top",
    "report_bottom",
    "tender_report_budget_below",
  ]);
  const fallback = map.tender_report_budget_below ?? null;
  return {
    report_top: applySlotScriptFallback(map.report_top ?? null, fallback),
    report_bottom: applySlotScriptFallback(map.report_bottom ?? null, fallback),
  };
}

/** 일간 입찰 리포트 본문 인라인 슬롯 */
export async function getActiveTenderReportInlineAds(): Promise<{
  tender_report_glance_below: HomeAdSlotWithCampaign | null;
  tender_report_budget_below: HomeAdSlotWithCampaign | null;
  tender_report_premium_core_below: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "tender_report_glance_below",
    "tender_report_budget_below",
    "tender_report_premium_core_below",
  ]);
  const fallback = map.tender_report_budget_below ?? null;
  return {
    tender_report_glance_below: applySlotScriptFallback(
      map.tender_report_glance_below ?? null,
      fallback
    ),
    tender_report_budget_below: map.tender_report_budget_below ?? null,
    tender_report_premium_core_below: applySlotScriptFallback(
      map.tender_report_premium_core_below ?? null,
      fallback
    ),
  };
}

/** @deprecated getActiveTenderReportInlineAds 사용 */
export async function getActivePostDetailAds(): Promise<{
  tender_report_glance_below: HomeAdSlotWithCampaign | null;
  tender_report_budget_below: HomeAdSlotWithCampaign | null;
  tender_report_premium_core_below: HomeAdSlotWithCampaign | null;
}> {
  return getActiveTenderReportInlineAds();
}

function applySlotScriptFallback(
  slot: HomeAdSlotWithCampaign | null,
  fallback: HomeAdSlotWithCampaign | null
): HomeAdSlotWithCampaign | null {
  if (!slot?.enabled) return null;
  if (slot.script_content?.trim() || slot.campaign) return slot;
  if (fallback?.script_content?.trim() || fallback?.campaign) {
    return {
      ...slot,
      slot_type: fallback.slot_type,
      script_content: fallback.script_content,
      campaign: fallback.campaign,
      coupang_products: fallback.coupang_products,
      coupang_fetch_error: fallback.coupang_fetch_error,
    };
  }
  return slot;
}

/** 입주레이더 허브 — 펄스 아래 / 빈 화면 / 표 아래 */
export async function getActiveDemandHubAds(): Promise<{
  radar_pulse_below: HomeAdSlotWithCampaign | null;
  radar_empty_state: HomeAdSlotWithCampaign | null;
  radar_table_below: HomeAdSlotWithCampaign | null;
  radar_regional_fallback: HomeAdSlotWithCampaign | null;
}> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "radar_pulse_below",
    "radar_empty_state",
    "radar_table_below",
    "radar_regional_fallback",
    "tender_report_budget_below",
  ]);
  const fallback = map.tender_report_budget_below ?? null;
  return {
    radar_pulse_below: applySlotScriptFallback(map.radar_pulse_below ?? null, fallback),
    radar_empty_state: applySlotScriptFallback(map.radar_empty_state ?? null, fallback),
    radar_table_below: applySlotScriptFallback(map.radar_table_below ?? null, fallback),
    /** 지역 직거래 대체 — 입주레이더 전용 슬롯만 사용 (공통 fallback 미적용) */
    radar_regional_fallback: map.radar_regional_fallback ?? null,
  };
}

/** 입찰 목록: 업종 필터 시 진행 중 공고 3번째 슬롯 */
export async function getActiveTendersIndustryListAd(): Promise<HomeAdSlotWithCampaign | null> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "tenders_industry_open_3rd",
    "tender_report_budget_below",
  ]);
  return applySlotScriptFallback(
    map.tenders_industry_open_3rd ?? null,
    map.tender_report_budget_below ?? null
  );
}

/** 낙찰공고 목록: 업종 필터 시 2~3번째 공고 사이 */
export async function getActiveAwardsIndustryListAd(): Promise<HomeAdSlotWithCampaign | null> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "awards_industry_list_3rd",
    "tender_report_budget_below",
  ]);
  return applySlotScriptFallback(
    map.awards_industry_list_3rd ?? null,
    map.tender_report_budget_below ?? null
  );
}

/** 입찰 상세: 요약 카드와 진행·낙찰 상태 카드 사이 */
export async function getActiveTenderDetailSummaryAd(): Promise<HomeAdSlotWithCampaign | null> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "tender_detail_summary_below",
    "tender_report_budget_below",
  ]);
  return applySlotScriptFallback(
    map.tender_detail_summary_below ?? null,
    map.tender_report_budget_below ?? null
  );
}

/** 입찰 상세: 입찰 전략 가격 카드 아래 */
export async function getActiveTenderDetailStrategyAd(): Promise<HomeAdSlotWithCampaign | null> {
  const supabase = createClient();
  const map = await getActiveAdsForSlotKeys(supabase, [
    "tender_detail_strategy_below",
    "tender_report_budget_below",
  ]);
  return applySlotScriptFallback(
    map.tender_detail_strategy_below ?? null,
    map.tender_report_budget_below ?? null
  );
}

/** 키 목록으로 슬롯 데이터 조회 (관리자·이벤트용) */
export async function getActiveAdsByKeys(
  keys: HomeAdSlotKey[]
): Promise<Record<string, HomeAdSlotWithCampaign | null>> {
  const supabase = createClient();
  return getActiveAdsForSlotKeys(supabase, keys);
}
