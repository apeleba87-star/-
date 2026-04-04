/**
 * 일간 입찰 리포트 Cron: 한국 시간 기준 주말(토·일)에는 실행하지 않음.
 * 실행 시각은 vercel.json UTC 스케줄로 맞춤(평일 KST 23:59 전후).
 */

function seoulWeekday(at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(at);
}

/** null이면 리포트 생성 진행. 문자열이면 스킵 사유 */
export function getDailyReportCronSkipReason(at: Date = new Date()): string | null {
  const weekday = seoulWeekday(at);
  if (weekday === "Sat" || weekday === "Sun") return "weekend_kst";
  return null;
}
