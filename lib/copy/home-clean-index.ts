/** 클린아이덱스 홈 히어로 카피 */

/** 베타 모집 홈 노출 — 상태 / 교환 / 부담 */
export const HOME_CLEAN_INDEX_BETA = {
  status: "베타",
  exchange: "온보딩 지원",
  burden: "주 1회 15분",
  /** 히어로 CTA 아래 한 줄 */
  heroNote: "베타 참여 시 온보딩 지원 · 주 1회 15분 피드백",
  /** 검정 CTA 블록 본문 */
  ctaBody:
    "지금은 베타입니다. 가입하시면 온보딩을 지원하며, 주 1회 15분 정도의 피드백을 부탁드립니다. 현장 기록·체크리스트·고객 확인을 바로 써 보실 수 있습니다.",
  ctaPrimary: "베타로 시작하기",
} as const;

export const HOME_CLEAN_INDEX = {
  /** 흰 카드 히어로 첫 줄 — 이 문구 아래는 카드에서 생략 */
  heroHeadline: "청소업의 모든 기회",
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
  /** 히어로 주요 CTA — 공고 상세(또는 목록)로 이동 */
  tenderDetailCta: "공고 확인하기",
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
