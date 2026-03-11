/** KST(한국 시간) 기준 날짜 문자열 YYYY-MM-DD */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 오늘 날짜를 KST 기준 YYYY-MM-DD로 반환.
 * 오늘/내일 현장 뱃지, 마감 여부 판단에 사용.
 */
export function getKstTodayString(): string {
  const kst = new Date(Date.now() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10);
}

/**
 * 내일 날짜를 KST 기준 YYYY-MM-DD로 반환.
 */
export function getKstTomorrowString(): string {
  const kst = new Date(Date.now() + KST_OFFSET_MS);
  const tomorrow = new Date(kst.getTime() + 24 * 60 * 60 * 1000);
  return tomorrow.toISOString().slice(0, 10);
}

/**
 * YYYY-MM-DD 문자열에 일 수를 더한 날짜 문자열 반환.
 * 마감 후 1일 판단 등에 사용.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
