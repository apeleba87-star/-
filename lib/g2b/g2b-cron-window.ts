/**
 * G2B 자동 수집은 한국 시간(Asia/Seoul) 기준 평일 07:00~23:59, 4시간 간격 슬롯에서만 실행.
 * Vercel Cron은 UTC로 등록하고, 주말·새벽에 호출되면 여기서 스킵한다.
 */

const SLOT_HOURS_KST = [7, 11, 15, 19, 23] as const;

function seoulParts(at: Date): { weekday: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const hour = parseInt(get("hour"), 10);
  return { weekday, hour: Number.isNaN(hour) ? -1 : hour };
}

/** null이면 수집 진행. 문자열이면 스킵 사유 */
export function getG2bCronSkipReason(at: Date = new Date()): string | null {
  const { weekday, hour } = seoulParts(at);
  if (hour < 0) return "invalid_seoul_time";

  if (weekday === "Sat" || weekday === "Sun") return "weekend_kst";
  if (hour < 7) return "before_7_kst";
  if (hour > 23) return "after_day_kst";

  if (!SLOT_HOURS_KST.includes(hour as (typeof SLOT_HOURS_KST)[number])) {
    return "off_schedule_hour_kst";
  }
  return null;
}
