/**
 * 인력 구인 목록 정렬·필터 옵션 (평균보다 높은순, 내 주변 현장 제외)
 */

export type SortOption =
  | "latest"      // 최신순
  | "work_date"  // 작업일 빠른순
  | "pay_high"   // 일당 높은순
  | "closing";   // 마감 임박순

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "work_date", label: "작업일 빠른순" },
  { value: "pay_high", label: "일당 높은순" },
  { value: "closing", label: "마감 임박순" },
];

export type JobsListSearchParams = {
  mine?: string;
  sort?: SortOption;
  region?: string;
  district?: string;
  job_type?: string;
  skill_level?: string;
  work_date_from?: string;
  work_date_to?: string;
};
