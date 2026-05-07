// 주(週)는 항상 월요일 기준. 공휴일 보정 없음.
// 모든 계산은 KST/UTC 무관하게 "달력일(date)" 기준만 사용.

export const WEEKDAY_LABELS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** Date → YYYY-MM-DD (UTC 기반) */
export function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD → Date (UTC 자정) */
export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map((p) => Number.parseInt(p, 10));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

/** 해당 날짜가 속한 주의 월요일(UTC 자정) — JS getUTCDay(): 일=0, 월=1, …, 토=6 */
export function getMondayOfWeek(d: Date): Date {
  const dow = d.getUTCDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetToMonday));
  return monday;
}

/** 월요일 기준 주의 시작일 ISO */
export function getWeekStartIso(d: Date): string {
  return toIsoDate(getMondayOfWeek(d));
}

/** 월요일 시작 주의 7일치 ISO 날짜 [월,화,…,일] */
export function getWeekDays(weekStart: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() + i));
    out.push(toIsoDate(day));
  }
  return out;
}

/** JS getUTCDay()(일=0..토=6) → cleanidex 내부 표준 (일=0..토=6) — 동일하게 유지 */
export function jsDayToWeekday(jsDay: number): number {
  return jsDay;
}

/** weekdays(SMALLINT[]) 값 검증: 0..6 정수, 중복 없음, 비어있지 않음 */
export function normalizeWeekdays(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  const set = new Set<number>();
  for (const v of input) {
    const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
    if (!Number.isFinite(n) || n < 0 || n > 6) return null;
    set.add(n);
  }
  if (set.size === 0) return null;
  return Array.from(set).sort((a, b) => a - b);
}

/** 주 1회/3회 등 weekly_count 룰을 해당 주의 기대 방문 횟수로 환산 */
export function expectedVisitsForWeeklyCount(weeklyCount: number): number {
  if (!Number.isFinite(weeklyCount) || weeklyCount < 0) return 0;
  return Math.min(14, Math.max(0, Math.floor(weeklyCount)));
}

/** 요일 룰 + 해당 주의 일자 → 기대 방문 일자 ISO 배열 */
export function expectedDatesForWeekdayRule(weekStartIso: string, weekdays: number[]): string[] {
  const ws = parseIsoDate(weekStartIso);
  const days = getWeekDays(ws);
  const wantSet = new Set(weekdays);
  return days.filter((iso) => {
    const d = parseIsoDate(iso);
    return wantSet.has(d.getUTCDay());
  });
}
