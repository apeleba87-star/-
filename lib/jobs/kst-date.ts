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
 * KST 기준 "오늘" 00:00 ~ 23:59:59.999를 UTC ISO 문자열 [start, end]로 반환.
 * 업계 소식 "오늘 발행" 건수 등 KST 기준 당일 필터용.
 */
export function getKstTodayUtcRange(): [string, string] {
  const todayKst = getKstTodayString();
  const start = new Date(todayKst + "T00:00:00+09:00").toISOString();
  const end = new Date(todayKst + "T23:59:59.999+09:00").toISOString();
  return [start, end];
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

/** KST 기준 어제 날짜 YYYY-MM-DD */
export function getKstYesterdayString(): string {
  return addDaysToDateString(getKstTodayString(), -1);
}

/**
 * KST 달력일 하루를 UTC 구간 [start, end) 로 반환 (end는 다음날 KST 0시, half-open).
 */
export function getKstDayHalfOpenUtcRange(dateYmd: string): [string, string] {
  const start = new Date(`${dateYmd}T00:00:00+09:00`).toISOString();
  const next = addDaysToDateString(dateYmd, 1);
  const end = new Date(`${next}T00:00:00+09:00`).toISOString();
  return [start, end];
}
