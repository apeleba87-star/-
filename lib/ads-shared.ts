/**
 * 광고 슬롯 타입·유틸 (클라이언트·서버 공용, Supabase 미사용)
 */

export type HomeAdSlotKey =
  | "premium_banner"
  | "native_card"
  | "home_bottom"
  | "post_top"
  | "post_bottom"
  | "tenders_top"
  | "tenders_mid"
  | "listings_top"
  | "jobs_top"
  | "awards_top"
  | "awards_mid"
  | "tender_detail_top"
  | "tender_detail_bottom"
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
  categoryName?: string;
  isRocket?: boolean;
  isFreeShipping?: boolean;
};

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
  coupang_products?: CoupangBannerProduct[] | null;
  coupang_fetch_error?: string | null;
};

/** 슬롯에 노출할 콘텐츠(캠페인 또는 스크립트)가 있는지 */
export function isAdSlotRenderable(slot: HomeAdSlotWithCampaign | null | undefined): boolean {
  if (!slot?.enabled) return false;
  if (slot.campaign) return true;
  if (slot.slot_type === "coupang_api") return (slot.coupang_products?.length ?? 0) > 0;
  return Boolean(slot.script_content?.trim());
}
