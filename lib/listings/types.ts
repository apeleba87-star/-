/**
 * 청소업 현장/구인 리스팅 타입
 */

export const LISTING_TYPES = [
  "sale_regular",
  "referral_regular",
  "referral_one_time",
  "job_posting",
  "subcontract",
] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const LISTING_STATUSES = ["open", "closed"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const PAY_UNITS = ["day", "half_day", "hour"] as const;
export type PayUnit = (typeof PAY_UNITS)[number];

export const GRADE_LETTERS = ["S", "A", "B", "C", "D"] as const;
export type GradeLetter = (typeof GRADE_LETTERS)[number];

/** 관리형 카테고리 (대분류 parent_id NULL, 소분류 parent_id 설정) */
export interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListingRow {
  id: string;
  user_id: string;
  listing_type: ListingType;
  status: ListingStatus;
  title: string;
  work_date: string | null;
  body: string | null;
  region: string;
  category_main: string | null;
  category_sub: string | null;
  category_main_id: string | null;
  category_sub_id: string | null;
  custom_subcategory_text: string | null;
  skill_level: string | null;
  pay_amount: number;
  pay_unit: PayUnit;
  normalized_daily_wage: number | null;
  normalized_hourly_wage: number | null;
  contact_phone: string;
  created_at: string;
  updated_at: string;
}

export interface MarketBenchmarkRow {
  region: string;
  category_main_id: string;
  category_sub_id: string | null;
  pay_unit: string;
  skill_level: string;
  sample_count: number;
  average_pay: number | null;
  average_normalized_daily_wage: number | null;
  updated_at: string;
}

export interface SellerMetricsRow {
  user_id: string;
  seller_score: number;
  seller_grade: string;
  avg_listing_grade_score: number | null;
  avg_job_wage_score: number | null;
  closing_rate: number | null;
  completion_rate: number | null;
  average_review_rating: number | null;
  total_review_count: number;
  listing_count: number;
  updated_at: string;
}

export interface ListingWithMeta extends ListingRow {
  display_title?: string;
  category_main_name?: string | null;
  category_sub_name?: string | null;
  average_normalized_daily_wage?: number | null;
  sample_count?: number;
  wage_gap_percent?: number | null;
  grade?: GradeLetter | null;
  grade_label?: string;
  seller_grade?: string | null;
  seller_display_name?: string | null;
}
