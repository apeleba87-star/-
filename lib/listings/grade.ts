/**
 * 등급 시스템: 평균 대비 % → S/A/B/C/D, 해석 문구
 */

import type { GradeLetter } from "./types";

/** S: +20% 이상, A: +10% 이상, B: ±10%, C: -10% 이상, D: -20% 미만 */
const GRADE_THRESHOLDS: { minPercent: number; grade: GradeLetter }[] = [
  { minPercent: 20, grade: "S" },
  { minPercent: 10, grade: "A" },
  { minPercent: -10, grade: "B" },
  { minPercent: -20, grade: "C" },
];

const GRADE_LABELS: Record<GradeLetter, string> = {
  S: "매우 좋은 조건",
  A: "좋은 조건",
  B: "평균 수준",
  C: "평균 이하",
  D: "낮은 조건",
};

const GRADE_DESCRIPTIONS: Record<GradeLetter, string> = {
  S: "평균보다 훨씬 좋은 조건입니다",
  A: "평균 수준 이상의 조건입니다",
  B: "평균 수준의 조건입니다",
  C: "평균보다 다소 낮은 조건입니다",
  D: "평균보다 낮은 조건입니다",
};

/** 평균 대비 차이 퍼센트 (현재금액 vs 평균금액) */
export function wageGapPercent(
  currentNormalizedDaily: number | null,
  averageNormalizedDaily: number | null
): number | null {
  if (
    currentNormalizedDaily == null ||
    averageNormalizedDaily == null ||
    averageNormalizedDaily <= 0
  ) {
    return null;
  }
  const gap = ((currentNormalizedDaily - averageNormalizedDaily) / averageNormalizedDaily) * 100;
  return Math.round(gap * 10) / 10;
}

/** 퍼센트 → S/A/B/C/D */
export function percentToGrade(gapPercent: number | null): GradeLetter | null {
  if (gapPercent == null) return null;
  for (const { minPercent, grade } of GRADE_THRESHOLDS) {
    if (gapPercent >= minPercent) return grade;
  }
  return "D";
}

/** 등급 라벨 */
export function getGradeLabel(grade: GradeLetter | null): string {
  if (!grade) return "—";
  return GRADE_LABELS[grade];
}

/** 등급 해석 문구 */
export function getGradeDescription(grade: GradeLetter | null): string {
  if (!grade) return "평균 데이터가 없어 비교할 수 없습니다.";
  return GRADE_DESCRIPTIONS[grade];
}

/** 사장 등급 라벨 */
export const SELLER_GRADE_LABELS: Record<string, string> = {
  S: "매우 좋은 사장",
  A: "좋은 사장",
  B: "평균적인 사장",
  C: "주의가 필요한 사장",
  D: "위험 신호가 있는 사장",
  N: "평가 데이터 부족",
};

export function getSellerGradeLabel(grade: string | null): string {
  if (!grade) return "—";
  return SELLER_GRADE_LABELS[grade] ?? grade;
}
