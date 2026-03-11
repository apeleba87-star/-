/**
 * KST(한국 표준시) 기준 날짜·구간 계산.
 * run_key·tenders 조회 범위를 모두 여기서 통일해 타임존 혼선 방지.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKst(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

/** KST 기준 YYYY-MM-DD */
export function getKstDateString(date?: Date): string {
  const d = date ? toKst(date) : toKst(new Date());
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 해당 KST 일자의 00:00:00 ~ 23:59:59.999 에 해당하는 UTC 구간 [start, end] (ISO 문자열) */
export function getKstDayRange(date?: Date): { start: string; end: string } {
  const d = date ?? new Date();
  const kst = toKst(d);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const day = kst.getUTCDate();
  const start = new Date(Date.UTC(y, m, day, 0, 0, 0, 0) - KST_OFFSET_MS).toISOString();
  const end = new Date(Date.UTC(y, m, day, 14, 59, 59, 999)).toISOString();
  return { start, end };
}

/** 해당 주(월요일 시작) KST [start, end] UTC. date가 포함된 주의 월요일 00:00 ~ 일요일 23:59:59 */
export function getKstWeekRange(date?: Date): { start: string; end: string } {
  const d = date ?? new Date();
  const kst = toKst(d);
  const dayOfWeek = kst.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(kst);
  monday.setUTCDate(kst.getUTCDate() + mondayOffset);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const start = new Date(monday.getTime() - KST_OFFSET_MS).toISOString();
  const end = new Date(sunday.getTime() - KST_OFFSET_MS).toISOString();
  return { start, end };
}

/** YYYY-Wnn (ISO week) */
export function getKstWeekKey(date?: Date): string {
  const d = date ?? new Date();
  const kst = toKst(d);
  const startOfYear = new Date(Date.UTC(kst.getUTCFullYear(), 0, 1));
  const days = Math.floor((kst.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
  return `${kst.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** 해당 월 KST [start, end] UTC */
export function getKstMonthRange(year: number, month: number): { start: string; end: string } {
  const startUtc = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const start = new Date(startUtc.getTime() - KST_OFFSET_MS).toISOString();
  const end = new Date(endUtc.getTime() - KST_OFFSET_MS).toISOString();
  return { start, end };
}

/** KST 기준 YYYY-MM */
export function getKstMonthKey(date?: Date): string {
  const d = date ?? new Date();
  const kst = toKst(d);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
