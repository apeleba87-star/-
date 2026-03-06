/**
 * 인력구인: job_posts (현장 1개) + job_post_positions (여러 포지션)
 */

export type PayUnit = "day" | "half_day" | "hour";

export type JobPostStatus = "open" | "closed";
export type PositionStatus = "open" | "partial" | "closed";

export interface JobPostRow {
  id: string;
  user_id: string;
  title: string;
  region: string;
  district: string;
  work_date: string | null;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  contact_phone: string;
  status: JobPostStatus;
  created_at: string;
  updated_at: string;
}

export interface JobPostPositionRow {
  id: string;
  job_post_id: string;
  category_main_id: string;
  category_sub_id: string | null;
  custom_subcategory_text: string | null;
  skill_level: string | null;
  pay_amount: number;
  pay_unit: PayUnit;
  normalized_daily_wage: number | null;
  required_count: number;
  filled_count: number;
  work_scope: string | null;
  notes: string | null;
  status: PositionStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PositionInput {
  category_main_id: string;
  category_sub_id: string | null;
  custom_subcategory_text: string | null;
  pay_amount: number;
  pay_unit: PayUnit;
  required_count: number;
  work_scope?: string | null;
  notes?: string | null;
}

export const POSITION_STATUS_LABELS: Record<PositionStatus, string> = {
  open: "모집중",
  partial: "일부마감",
  closed: "마감",
};
