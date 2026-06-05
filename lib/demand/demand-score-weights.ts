/** V1 — 설명 가능 가중치 (튜닝은 6개월+ 데이터 후) */

/** 전국 이사관심도 본지표 — 포장·입주 Basket MoM만 반영 (합 0.7 → 100% 재정규화) */
export const NATIONAL_INTEREST_CORE_WEIGHTS = {
  packing: 0.4,
  moveIn: 0.3,
} as const;

/** @deprecated NATIONAL_INTEREST_CORE_WEIGHTS 사용. 손없는날은 지수 미반영·보조 참고만 */
export const NATIONAL_INTEREST_WEIGHTS = {
  ...NATIONAL_INTEREST_CORE_WEIGHTS,
  handFree: 0,
} as const;

export const DISTRICT_RTMS_WEIGHTS = {
  jeonse: 0.7,
  sale: 0.3,
} as const;

export const NATIONAL_INTEREST_BASE = 100;
export const DISTRICT_RTMS_BASE = 100;

/** UI 구간 — 지역수요점수 (demandScore) */
export const DEMAND_HEAT_BAND_THRESHOLDS = {
  veryHot: 160,
  hot: 140,
  rising: 120,
  normal: 100,
} as const;
