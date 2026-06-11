/**
 * 광고 슬롯 타입·유틸 (클라이언트·서버 공용, Supabase 미사용)
 */

export type HomeAdSlotKey =
  | "tender_report_glance_below"
  | "tender_report_budget_below"
  | "tender_report_premium_core_below"
  | "award_report_key_metrics_below"
  | "award_report_top_awards_above"
  | "marketing_report_suggested_titles_1_2"
  | "estimate_analyze_below"
  | "tenders_industry_open_3rd"
  | "tender_detail_summary_below"
  | "tender_detail_strategy_below"
  | "awards_industry_list_3rd"
  | "radar_pulse_below"
  | "radar_empty_state"
  | "radar_table_below"
  | "radar_regional_fallback"
  | "report_top"
  | "report_bottom";

export type AdSlotType = "direct" | "google" | "coupang" | "coupang_api";

/** 쿠팡 파트너스 API 캐시 상품 (배너용) */
export type CoupangBannerProduct = {
  productId: number;
  productName: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
};

export type HomeAdCampaign = {
  id: string;
  home_ad_slot_id: string;
  title: string;
  description: string | null;
  cta_text: string;
  cta_url: string;
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
  coupang_products?: CoupangBannerProduct[] | null;
  coupang_fetch_error?: string | null;
};

export function isAdSlotRenderable(slot: HomeAdSlotWithCampaign | null | undefined): boolean {
  if (!slot?.enabled) return false;
  if (slot.campaign) return true;
  if (slot.slot_type === "coupang_api") {
    return (slot.coupang_products?.length ?? 0) > 0 || Boolean(slot.script_content?.trim());
  }
  return Boolean(slot.script_content?.trim());
}
