import { formatMagamWhen } from "@/lib/format/kr-datetime";

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function todayTimeFromMagamWhen(iso: string): string | null {
  const when = formatMagamWhen(iso);
  const match = when.match(/(오전|오후)\s+\d{1,2}:\d{2}$/);
  return match ? match[0] : null;
}

/** /p/ 공고 — 마감 후 경과 (1시간 미만: N분 전, 당일: 오늘 시각, 이전: 월일) */
export function formatMagamClosedAgo(
  iso: string | null | undefined,
  now = new Date()
): string | null {
  if (!iso?.trim()) return null;

  const closed = new Date(iso);
  if (Number.isNaN(closed.getTime())) return null;

  const diffMs = now.getTime() - closed.getTime();
  if (diffMs < 0) return null;

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금 마감";
  if (diffMin < 60) return `${diffMin}분 전 마감`;

  if (localDayKey(closed) === localDayKey(now)) {
    const time = todayTimeFromMagamWhen(iso);
    return time ? `오늘 ${time} 마감` : "오늘 마감";
  }

  return `${closed.getMonth() + 1}월 ${closed.getDate()}일 마감`;
}

/** /p/ 공고 — 등록 후 경과 (24시간 이내만 표시) */
export function formatMagamPostedAgo(iso: string, now = new Date()): string | null {
  const posted = new Date(iso);
  if (Number.isNaN(posted.getTime())) return null;

  const diffMs = now.getTime() - posted.getTime();
  if (diffMs < 0) return null;

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금 등록";
  if (diffMin < 60) return `${diffMin}분 전 등록`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24 && localDayKey(posted) === localDayKey(now)) {
    const time = todayTimeFromMagamWhen(iso);
    return time ? `오늘 ${time} 등록` : "오늘 등록";
  }

  return null;
}
