/**
 * 인력 구인 "작업 종류" 빠른 선택용 프리셋.
 * 사용자에게는 라벨만 보여주고, 내부적으로 category slug → 정규화 키로 매핑.
 */

export type NormalizationStatus = "auto_mapped" | "manual_review" | "manual_mapped";

/** 프리셋 한 건: 화면 라벨 + 내부 정규화 키 + category 소분류 slug (categories 테이블의 slug) */
export interface JobTypePreset {
  /** 내부 표준 키 (단가 집계용) */
  key: string;
  /** 사용자에게 보여줄 라벨 */
  label: string;
  /** categories 테이블의 소분류 slug. 이 slug로 category_sub_id 조회 후 parent_id가 category_main_id */
  subSlug: string;
}

/** 빠른 선택용 작업 종류 목록 (순서대로 노출) */
export const JOB_TYPE_PRESETS: JobTypePreset[] = [
  { key: "window_cleaning", label: "유리청소", subSlug: "window" },
  { key: "completion_cleaning", label: "준공청소", subSlug: "completion" },
  { key: "move_in_cleaning", label: "입주청소", subSlug: "move_in" },
  { key: "school_cleaning", label: "학교청소", subSlug: "kindergarten" },
  { key: "floor_wax", label: "왁스작업", subSlug: "floor" },
  { key: "toilet_cleaning", label: "화장실청소", subSlug: "disinfection" },
  { key: "store_cleaning", label: "상가청소", subSlug: "office" },
  { key: "restaurant_cleaning", label: "식당 청소", subSlug: "restaurant" },
  { key: "exterior_cleaning", label: "외벽청소", subSlug: "exterior" },
  { key: "high_altitude", label: "고소작업", subSlug: "high_altitude" },
  { key: "signal_person", label: "신호수", subSlug: "signal" },
  { key: "disinfection", label: "소독", subSlug: "disinfection" },
];

export const JOB_TYPE_OTHER = "__other__" as const;

/** 숙련도: 기공(숙련자) / 일반(보조) */
export type SkillLevel = "expert" | "general";

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  expert: "숙련자(기공)",
  general: "일반(보조)",
};
