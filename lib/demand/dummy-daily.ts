/** Phase 0 — 매일 브리핑 더미 (전국 검색 펄스 + 구별 입찰·월간 지수 링크) */

export const DEMAND_TODAY_META = {
  briefingDateLabel: "2025년 5월 21일",
  briefingDateYmd: "2025-05-21",
  collectedAtLabel: "오늘 09:00 집계 (더미)",
  compareLabel: "어제 vs 그제",
} as const;

/** 마케팅 리포트와 동일한 맥락 — 전국 키워드 일간 변화 */
export type DemandDailyKeywordPulse = {
  id: string;
  name: string;
  dayOverDayPercent: number;
  weekHint: string;
  role: "lead" | "follow" | "other";
};

export const DEMAND_DAILY_NATIONAL_KEYWORDS: DemandDailyKeywordPulse[] = [
  {
    id: "packing",
    name: "포장이사",
    dayOverDayPercent: 1.2,
    weekHint: "최근 7일 상승 흐름",
    role: "lead",
  },
  {
    id: "move-in-clean",
    name: "입주청소",
    dayOverDayPercent: 0.6,
    weekHint: "전일 대비 소폭 상승",
    role: "follow",
  },
  {
    id: "move-clean",
    name: "이사청소",
    dayOverDayPercent: 0.3,
    weekHint: "보합권",
    role: "other",
  },
  {
    id: "grout",
    name: "줄눈시공",
    dayOverDayPercent: -0.4,
    weekHint: "소폭 하락",
    role: "other",
  },
];

export type DemandDailyGuRow = {
  gu: string;
  slug: string;
  newTendersToday: number;
  newTendersYesterday: number;
  monthlyIndex: number;
  monthlySignal: "strong" | "neutral" | "weak";
  note: string;
};

/** 관심 구 기본값(워치리스트 비었을 때) */
export const DEMAND_DAILY_DEFAULT_GU_ROWS: DemandDailyGuRow[] = [
  {
    gu: "강서구",
    slug: "gangseo-gu",
    newTendersToday: 2,
    newTendersYesterday: 1,
    monthlyIndex: 132,
    monthlySignal: "strong",
    note: "전국 포장이사 상승 + 신규 입찰 2건",
  },
  {
    gu: "양천구",
    slug: "yangcheon-gu",
    newTendersToday: 0,
    newTendersYesterday: 1,
    monthlyIndex: 118,
    monthlySignal: "strong",
    note: "신규 입찰 없음 · 월간 지수는 상위권",
  },
  {
    gu: "마포구",
    slug: "mapo-gu",
    newTendersToday: 1,
    newTendersYesterday: 0,
    monthlyIndex: 105,
    monthlySignal: "strong",
    note: "입찰 1건 · 거래 지표는 이번 달 탭에서",
  },
];

export const DEMAND_DAILY_INSIGHT =
  "전국 포장이사 검색지수가 어제보다 올랐습니다. 강서·양천은 월간 입주 온도도 상위권 — 오늘 당근·입찰 확인을 권합니다. (더미 해석)";
