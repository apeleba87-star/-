/** 클린아이덱스 홈 히어로 카피 */

export const HOME_CLEAN_INDEX = {
  /** 맨 위 정체성 — 히어로에서 lead / highlight / brand 로 나눠 스타일 적용 */
  slogan: "청소업의 모든 기회, 데이터로 한눈에 - 클린아이덱스",
  sloganLead: "청소업의 모든 기회, ",
  sloganHighlight: "데이터로 한눈에",
  sloganBrand: " - 클린아이덱스",
  sloganSub:
    "매일 업데이트되는 억대 입찰 공고와 안정적인 연봉 일자리를 확인하세요.",
  brandMark: "클린아이덱스",
  tagline: "청소업의 모든 기회, 데이터로 한눈에 — 클린아이덱스",
  tenderHeroLabel: "오늘의 최고가 사업",
  tenderScopeNote: "등록 업종 매칭 공고 기준",
  tenderSourceNote: "나라장터 등 공공 입찰 공고 집계",
  protagonistQuestion: "이 입찰의 주인공이 되시겠습니까?",
  reportCta: "분석 리포트 확인",
  reportCtaSub: "미리보기 후 · 전체는 로그인",
  /** 채용 스포트라이트(워크넷 연동 전 비노출)용 카피 보관 */
  jobSectionTitle: "함께할 일자리",
  jobSectionKicker: "채용 스포트라이트",
  jobFootnoteTemplate: (dailyLabel: string) =>
    `${dailyLabel} · 월 22일·연 220일 가정 세전 환산`,
  jobCta: "조건 상세 보기",
  jobSourceNote: "플랫폼 등록 구인 · 일당 기준",
  jobEmptyHint: "조건에 맞는 구인이 없습니다. 목록에서 찾아보세요.",
} as const;

export const HOME_REPORT_TEASER = {
  title: "입찰 리포트 미리보기",
  intro: "이 공고와 함께, 리포트에서는 보통 아래를 한 번에 봅니다.",
  bullets: [
    "마감 임박·개찰 예정 등 오늘의 우선순위 공고",
    "금액·지역·업종별 요약 지표",
    "청소·방역 업종에 맞춘 공고 흐름 정리",
  ],
  loginCta: "로그인하고 전체 리포트 보기",
  guestListCta: "리포트 목록만 보기",
} as const;
