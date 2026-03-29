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
  address: string | null;
  work_date: string | null;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  contact_phone: string;
  status: JobPostStatus;
  created_at: string;
  updated_at: string;
  /** 구인 상세 조회 집계(타인 조회, 5분 쿨다운) */
  view_count?: number;
}

export interface JobPostPositionRow {
  id: string;
  job_post_id: string;
  category_main_id: string;
  category_sub_id: string | null;
  custom_subcategory_text: string | null;
  job_type_input: string | null;
  normalized_job_type_key: string | null;
  normalization_status: string | null;
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
  /** 프리셋 키 또는 "__other__" */
  job_type_key?: string | null;
  /** 사용자가 선택/입력한 작업 종류 (표시용 + 저장) */
  job_type_input?: string | null;
  /** 서버에서 채움: 프리셋 매핑 시 */
  category_main_id?: string | null;
  category_sub_id?: string | null;
  custom_subcategory_text?: string | null;
  /** expert | general */
  skill_level?: "expert" | "general" | null;
  pay_amount: number;
  pay_unit: PayUnit;
  required_count: number;
  work_scope?: string | null;
  notes?: string | null;
  work_period?: "am" | "pm" | null;
  start_time?: string | null;
  end_time?: string | null;
}

export type ApplicationStatus =
  | "applied"
  | "reviewing"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "no_show_reported";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "지원함",
  reviewing: "검토 중",
  accepted: "확정",
  rejected: "거절됨",
  cancelled: "취소됨",
  no_show_reported: "노쇼 발생",
};

export const POSITION_STATUS_LABELS: Record<PositionStatus, string> = {
  open: "모집중",
  partial: "일부마감",
  closed: "마감",
};

export type WorkPeriod = "am" | "pm";
