/** 홈 랜딩 리뉴얼 — 섹션 카피 */

export const HOME_LANDING = {
  valueTitle: "청소 업무에 맞춘 정보와 도구",
  valueSubtitle: "공공 입찰부터 견적·청소 지식까지 한곳에서 이어집니다.",
  trustEyebrow: "실시간 집계",
  trustTitle: "오늘 플랫폼에서 움직이는 숫자",
  bottomTitle: "지금 입찰 기회를 확인해 보세요",
  bottomSubtitle:
    "등록 업종에 맞는 공고와 리포트 미리보기는 로그인 후 더 넓게 이용할 수 있습니다.",
  bottomPrimary: "입찰 둘러보기",
  bottomSecondary: "로그인",
  bottomTertiary: "입찰공고",
} as const;

/** 레거시 홈 그리드용 — 숨김 기능 카드는 제외 */
export const HOME_VALUE_CARDS = [
  {
    key: "tenders",
    title: "공공 입찰",
    description: "등록 업종 기준 진행 중인 청소·방역 공고를 빠르게 찾습니다.",
    href: "/tenders",
    icon: "trending",
  },
  {
    key: "estimate",
    title: "견적 계산",
    description: "면적·인건비 기준 예상 견적을 산출해 보세요.",
    href: "/estimate",
    icon: "calculator",
  },
] as const;
