/**
 * 같은 지원자의 확정 건들 간 시간 충돌 여부
 * work_date + start_time, end_time (자정 넘김 시 end < start)
 */

export type Slot = {
  work_date: string | null; // YYYY-MM-DD
  start_time: string | null; // HH:mm or HH:mm:ss
  end_time: string | null;
};

function toTs(date: string, time: string | null, dayOffset: number): number {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + dayOffset);
  const ymd = d.toISOString().slice(0, 10);
  const t = time ? time.slice(0, 5) : (dayOffset === 0 ? "00:00" : "23:59");
  return new Date(ymd + "T" + t + ":00").getTime();
}

function nextDay(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** 두 슬롯이 겹치면 true. 날짜 없으면 충돌 체크 안 함(false). */
export function slotsOverlap(a: Slot, b: Slot): boolean {
  if (!a.work_date || !b.work_date) return false;

  const aStart = toTs(a.work_date, a.start_time, 0);
  let aEnd: number;
  if (a.end_time && a.start_time && a.end_time < a.start_time) {
    aEnd = toTs(nextDay(a.work_date), a.end_time, 0);
  } else {
    aEnd = toTs(a.work_date, a.end_time ?? "23:59", 0);
  }

  const bStart = toTs(b.work_date, b.start_time, 0);
  let bEnd: number;
  if (b.end_time && b.start_time && b.end_time < b.start_time) {
    bEnd = toTs(nextDay(b.work_date), b.end_time, 0);
  } else {
    bEnd = toTs(b.work_date, b.end_time ?? "23:59", 0);
  }

  return aStart < bEnd && bStart < aEnd;
}
