import { addDaysToDateString, getKstTodayString } from "@/lib/jobs/kst-date";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type StatsDateRange = {
  from: string;
  to: string;
};

/** KST 달력일 from~to 포함 → UTC half-open [start, end) */
export function kstInclusiveUtcRange(fromYmd: string, toYmd: string): [string, string] {
  const start = new Date(`${fromYmd}T00:00:00+09:00`).toISOString();
  const next = addDaysToDateString(toYmd, 1);
  const endExclusive = new Date(`${next}T00:00:00+09:00`).toISOString();
  return [start, endExclusive];
}

export function parseStatsDateRange(fromRaw?: string, toRaw?: string): StatsDateRange {
  const today = getKstTodayString();
  const defaultFrom = addDaysToDateString(today, -29);

  let from =
    fromRaw?.trim() && DATE_RE.test(fromRaw.trim()) ? fromRaw.trim() : defaultFrom;
  let to = toRaw?.trim() && DATE_RE.test(toRaw.trim()) ? toRaw.trim() : today;

  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  const maxFrom = addDaysToDateString(to, -365);
  if (from < maxFrom) from = maxFrom;

  return { from, to };
}
