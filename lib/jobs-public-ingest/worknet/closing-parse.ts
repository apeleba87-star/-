/** 워크넷 날짜 YYYYMMDD 또는 YYYY-MM-DD */
export function parseWorknetDate(raw: string | null | undefined): Date | null {
  const s = (raw ?? "").replace(/\D/g, "");
  if (s.length < 8) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 23, 59, 59);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function closingLabel(closingAt: Date | null, now = new Date()): string {
  if (!closingAt) return "채용시까지";
  const end = closingAt.getTime();
  if (Number.isNaN(end)) return "채용시까지";
  const day = Math.ceil((end - now.getTime()) / (24 * 60 * 60 * 1000));
  if (day < 0) return "마감";
  if (day === 0) return "오늘 마감";
  if (day === 1) return "내일 마감";
  return `마감 ${day}일 전`;
}

export function isOpeningOpen(closingAt: Date | null, now = new Date()): boolean {
  if (!closingAt) return true;
  return closingAt.getTime() >= now.getTime();
}
