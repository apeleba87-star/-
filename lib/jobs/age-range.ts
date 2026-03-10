/**
 * 출생년도 → 나이대 표기 (30대 초/중/후 등)
 * 구직자가 나이를 완전 공개하지 않아도 되도록 구간으로 표시
 *
 * 규칙 (사용자 제안):
 * - 30~32: 30대 초
 * - 33~36: 30대 중
 * - 37~39: 30대 후
 * 다른 연령대도 동일 패턴: 초(3년), 중(4년), 후(3년)
 */

const REFERENCE_YEAR = new Date().getFullYear();

/**
 * 출생년도와 기준년도로 만 나이(년 단위) 계산
 */
export function ageFromBirthYear(birthYear: number, referenceYear: number = REFERENCE_YEAR): number {
  return referenceYear - birthYear;
}

/**
 * 나이(숫자) → "30대 초" 형태 문자열
 * 10대: 초 10-12, 중 13-16, 후 17-19
 * 20대~50대+: 초(3년), 중(4년), 후(3년)
 */
export function ageToRangeLabel(age: number): string {
  if (age < 0) return "—";
  if (age < 10) return "10대 미만";
  const decade = Math.floor(age / 10) * 10; // 10, 20, 30, ...
  const inDecade = age - decade; // 0~9
  if (decade === 10) {
    if (inDecade <= 2) return "10대 초";
    if (inDecade <= 6) return "10대 중";
    return "10대 후";
  }
  if (inDecade <= 2) return `${decade}대 초`;
  if (inDecade <= 6) return `${decade}대 중`;
  return `${decade}대 후`;
}

/**
 * 출생년도 → "30대 초" 형태 (구인자에게 지원자 나이대 표시용)
 */
export function birthYearToAgeRangeLabel(birthYear: number | null, referenceYear: number = REFERENCE_YEAR): string {
  if (birthYear == null || birthYear < 1900 || birthYear > 2100) return "—";
  const age = ageFromBirthYear(birthYear, referenceYear);
  return ageToRangeLabel(age);
}
