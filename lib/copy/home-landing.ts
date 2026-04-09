/** 홈 랜딩 리뉴얼 — 섹션 카피 */

export const HOME_LANDING = {
  valueTitle: "청소 업무에 맞춘 정보와 도구",
  valueSubtitle:
    "공공 입찰부터 현장 거래·구인·데이터랩·견적까지 한곳에서 이어집니다.",
  trustEyebrow: "실시간 집계",
  trustTitle: "오늘 플랫폼에서 움직이는 숫자",
  bottomTitle: "지금 입찰 기회를 확인해 보세요",
  bottomSubtitle:
    "등록 업종에 맞는 공고와 리포트 미리보기는 로그인 후 더 넓게 이용할 수 있습니다.",
  bottomPrimary: "입찰 둘러보기",
  bottomSecondary: "로그인",
  bottomTertiary: "데이터랩",
} as const;

export const HOME_VALUE_CARDS = [
  {
    key: "tenders",
    title: "공공 입찰",
    description: "등록 업종 기준 진행 중인 청소·방역 공고를 빠르게 찾습니다.",
    href: "/tenders",
    icon: "trending",
  },
  {
    key: "news",
    title: "데이터랩",
    description: "리포트·뉴스·이슈를 데이터랩에서 한곳에 모았습니다.",
    href: "/news",
    icon: "newspaper",
  },
  {
    key: "listings",
    title: "현장 거래",
    description: "소개·위탁 등 현장 연결 게시를 한곳에서 봅니다.",
    href: "/listings",
    icon: "briefcase",
  },
  {
    key: "jobs",
    title: "인력 구인",
    description: "일당·현장 구인 정보를 모아 일자리를 찾거나 모집합니다.",
    href: "/jobs",
    icon: "userplus",
  },
  {
    key: "estimate",
    title: "견적 계산",
    description: "면적·인건비 기준 예상 견적을 산출해 보세요.",
    href: "/estimate",
    icon: "calculator",
  },
] as const;
