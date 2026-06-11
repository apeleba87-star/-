/** 입주레이더 허브 — 당일 일당 티저 카피 (구직·구인 공통 질문 프레임) */

export function jobWageHubSlimHook(): string {
  return "이 일당, 적정할까요?";
}

export function jobWageHubSlimDetail(excerpt: string, dominantCategory: string | null): string {
  if (dominantCategory) return `오늘 시세 · ${dominantCategory} 최다`;
  return excerpt ? `오늘 시세 · ${excerpt}` : "오늘 당일 시세";
}

export function jobWageRegionBridgeHeadline(regionLabel: string): string {
  return `${regionLabel}, 이 일당 적정할까요?`;
}

export function jobWageRegionBridgeDetail(
  dominantCategory: string | null,
  excerpt: string,
  hasPosts: boolean
): string {
  if (!hasPosts) return "오늘 이 지역 공고가 아직 없어요. 전국 시세와 비교해 보세요.";
  if (dominantCategory) return `오늘 시세 · ${dominantCategory} 공고 최다`;
  return excerpt ? `오늘 시세 · ${excerpt}` : "오늘 등록된 공고 기준 시세";
}

export const JOB_WAGE_HUB_CTA_LABEL = "시세 확인";

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 지역 선택 카드 — 전국 최고 일당 비교 앵커 */
export function jobWageNationalTopBadge(
  topProvince: string,
  avgDailyWon: number | null,
  amountsVisible: boolean,
  isLocalTop: boolean
): { label: string; amount: string | null } {
  const label = isLocalTop ? `전국 1위 · ${topProvince}` : `전국 최고 · ${topProvince}`;
  const amount =
    amountsVisible && avgDailyWon != null ? formatWon(avgDailyWon) : null;
  return { label, amount };
}

export function jobWageNationalTopHint(isLocalTop: boolean): string {
  return isLocalTop
    ? "오늘 우리 지역이 전국에서 가장 높아요."
    : "우리 지역은 얼마일까요? 리포트에서 바로 비교해 보세요.";
}
