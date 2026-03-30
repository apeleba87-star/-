/** 마케팅 리포트 · 우리 팀 공유 시 본문(clipboard / Web Share API text) */
export const MARKETING_TEAM_SHARE_TEXT = "현재 급상승 키워드 확인하기";

/** 일당 리포트 · 우리 팀 공유 시 본문 — 기준일 KST(YYYY-MM-DD) → 「M월 D일 최고 일당 금액 지금 확인하기」 */
export function jobWageTeamShareText(reportDateYmd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDateYmd)) {
    return "최고 일당 금액 지금 확인하기";
  }
  const [, month, day] = reportDateYmd.split("-").map(Number);
  return `${month}월 ${day}일 최고 일당 금액 지금 확인하기`;
}
