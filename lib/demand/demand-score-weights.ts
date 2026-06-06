/** V2 — 입주 수요 (신호월 → 대상월) 설명 가능 가중치 */

/** 전국 신호 — 이사(포장) vs 입주청소 Basket 검색량·검색지수 */
export const NATIONAL_SIGNAL_WEIGHTS = {
  packingVolume: 0.25,
  moveInVolume: 0.25,
  packingIndex: 0.25,
  moveInIndex: 0.25,
} as const;

/** 구 RTMS — 규모(건수) vs 모멘텀(MoM) */
export const REGIONAL_RTMS_SIGNAL_WEIGHTS = {
  level: 0.7,
  momentum: 0.3,
} as const;

export const RTMS_ACTIVITY_WEIGHTS = {
  jeonse: 0.7,
  sale: 0.3,
} as const;

/** RTMS·검색 신호월 = 입주 대상월 − N (기본 1개월 선행) */
export const MOVE_IN_DEMAND_SIGNAL_LAG_MONTHS = 1;

/** 정규화 baseline — 최근 N개월 중앙값 */
export const MOVE_IN_DEMAND_BASELINE_MONTHS = 12;

export const NATIONAL_INTEREST_BASE = 100;
export const DISTRICT_RTMS_BASE = 100;

/** @deprecated V2 national signal weights */
export const NATIONAL_INTEREST_CORE_WEIGHTS = {
  packing: NATIONAL_SIGNAL_WEIGHTS.packingVolume,
  moveIn: NATIONAL_SIGNAL_WEIGHTS.moveInVolume,
} as const;

/** @deprecated V2 regional RTMS weights */
export const NATIONAL_INTEREST_WEIGHTS = {
  ...NATIONAL_INTEREST_CORE_WEIGHTS,
  handFree: 0,
} as const;

/** @deprecated use RTMS_ACTIVITY_WEIGHTS */
export const DISTRICT_RTMS_WEIGHTS = RTMS_ACTIVITY_WEIGHTS;

/** UI 구간 — 입주 예상 점수 (demandScore) */
export const DEMAND_HEAT_BAND_THRESHOLDS = {
  veryHot: 160,
  hot: 140,
  rising: 120,
  normal: 100,
} as const;
