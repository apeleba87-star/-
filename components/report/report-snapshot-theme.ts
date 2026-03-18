/**
 * 리포트 유형별 테마·레이아웃 설정.
 * 각 리포트의 목적에 맞게 색상·강조·배치를 다르게 해 빠른 이해를 돕는다.
 */

export const REPORT_TYPE_WEEKLY_MARKET_SUMMARY = "weekly_market_summary";
export const REPORT_TYPE_DEADLINE_SOON = "deadline_soon";
export const REPORT_TYPE_OPENING_SCHEDULED = "opening_scheduled";
export const REPORT_TYPE_LARGE_TENDER_TOP = "large_tender_top";
export const REPORT_TYPE_PREP_SHORT = "prep_short";
export const REPORT_TYPE_LISTING_MARKET_INTEL = "listing_market_intel";

export type ReportTheme = {
  /** 헤더 그라디언트 (Tailwind from-X via-Y to-Z) */
  headerGradient: string;
  /** 페이지 배경 그라디언트 */
  pageBg: string;
  /** 한 줄 결론 알림 박스: 왼쪽 테두리 + 배경 */
  alertBorder: string;
  alertBg: string;
  /** KPI 카드 그라디언트 3개 (순서대로) */
  kpiGradients: [string, string, string];
  /** 지역/TOP 섹션 액센트 */
  chartAccent: string;
  /** 순위 배지: 1·2·3위 그라디언트 */
  rankBadges: [string, string, string];
  /** 정보 카드 아이콘 그라디언트 [실무해석, 다음행동, 유리한대상] */
  infoGradients: [string, string, string];
  /** CTA 섹션 배경 그라디언트 */
  ctaGradient: string;
  /** CTA 주 버튼 스타일 */
  ctaPrimary: string;
  /** 헤더 배지 문구 (선택) */
  headerBadge?: string;
};

const themes: Record<string, ReportTheme> = {
  [REPORT_TYPE_WEEKLY_MARKET_SUMMARY]: {
    headerGradient: "from-purple-600 via-indigo-600 to-blue-600",
    pageBg: "from-slate-50 via-indigo-50/30 to-purple-50/30",
    alertBorder: "border-l-4 border-amber-400",
    alertBg: "bg-gradient-to-r from-amber-50 to-orange-50",
    kpiGradients: [
      "from-purple-500 to-indigo-600",
      "from-indigo-500 to-blue-600",
      "from-emerald-500 to-teal-600",
    ],
    chartAccent: "indigo",
    rankBadges: [
      "from-amber-400 to-yellow-500",
      "from-slate-300 to-slate-400",
      "from-amber-600 to-amber-700",
    ],
    infoGradients: [
      "from-purple-500 to-indigo-500",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
    ],
    ctaGradient: "from-indigo-600 to-purple-600",
    ctaPrimary: "bg-white text-indigo-600 hover:bg-indigo-50",
    headerBadge: "주간시장분석 리포트",
  },
  [REPORT_TYPE_DEADLINE_SOON]: {
    headerGradient: "from-rose-600 via-orange-500 to-amber-500",
    pageBg: "from-slate-50 via-rose-50/20 to-amber-50/20",
    alertBorder: "border-l-4 border-rose-500",
    alertBg: "bg-gradient-to-r from-rose-50 to-orange-50",
    kpiGradients: [
      "from-rose-500 to-red-600",
      "from-amber-500 to-orange-500",
      "from-orange-400 to-amber-500",
    ],
    chartAccent: "rose",
    rankBadges: [
      "from-rose-400 to-red-500",
      "from-amber-400 to-orange-500",
      "from-slate-400 to-slate-500",
    ],
    infoGradients: [
      "from-violet-500 to-purple-500",
      "from-sky-500 to-blue-500",
      "from-emerald-500 to-teal-500",
    ],
    ctaGradient: "from-rose-600 to-orange-600",
    ctaPrimary: "bg-white text-rose-600 hover:bg-rose-50",
    headerBadge: "마감 임박",
  },
  [REPORT_TYPE_OPENING_SCHEDULED]: {
    headerGradient: "from-blue-600 via-indigo-600 to-violet-600",
    pageBg: "from-slate-50 via-blue-50/30 to-indigo-50/30",
    alertBorder: "border-l-4 border-blue-400",
    alertBg: "bg-gradient-to-r from-blue-50 to-indigo-50",
    kpiGradients: [
      "from-blue-500 to-indigo-600",
      "from-indigo-500 to-violet-600",
      "from-cyan-500 to-blue-600",
    ],
    chartAccent: "blue",
    rankBadges: [
      "from-blue-400 to-indigo-500",
      "from-slate-300 to-slate-400",
      "from-amber-600 to-amber-700",
    ],
    infoGradients: [
      "from-indigo-500 to-violet-500",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
    ],
    ctaGradient: "from-indigo-600 to-violet-600",
    ctaPrimary: "bg-white text-indigo-600 hover:bg-indigo-50",
    headerBadge: "개찰 예정",
  },
  [REPORT_TYPE_LARGE_TENDER_TOP]: {
    headerGradient: "from-amber-500 via-emerald-600 to-teal-600",
    pageBg: "from-slate-50 via-amber-50/20 to-emerald-50/20",
    alertBorder: "border-l-4 border-amber-400",
    alertBg: "bg-gradient-to-r from-amber-50 to-emerald-50",
    kpiGradients: [
      "from-amber-500 to-yellow-500",
      "from-emerald-500 to-teal-600",
      "from-teal-500 to-cyan-600",
    ],
    chartAccent: "emerald",
    rankBadges: [
      "from-amber-300 via-yellow-400 to-amber-500",
      "from-slate-300 to-slate-400",
      "from-amber-600 to-amber-800",
    ],
    infoGradients: [
      "from-violet-500 to-purple-500",
      "from-emerald-500 to-teal-500",
      "from-amber-500 to-orange-500",
    ],
    ctaGradient: "from-emerald-600 to-teal-600",
    ctaPrimary: "bg-white text-emerald-700 hover:bg-emerald-50",
    headerBadge: "대형 공고",
  },
  [REPORT_TYPE_PREP_SHORT]: {
    headerGradient: "from-orange-500 via-amber-500 to-yellow-500",
    pageBg: "from-slate-50 via-orange-50/20 to-amber-50/30",
    alertBorder: "border-l-4 border-orange-500",
    alertBg: "bg-gradient-to-r from-orange-50 to-amber-50",
    kpiGradients: [
      "from-orange-500 to-amber-500",
      "from-amber-500 to-yellow-500",
      "from-rose-400 to-orange-500",
    ],
    chartAccent: "amber",
    rankBadges: [
      "from-orange-400 to-amber-500",
      "from-amber-500 to-yellow-500",
      "from-slate-400 to-slate-500",
    ],
    infoGradients: [
      "from-amber-500 to-orange-500",
      "from-sky-500 to-blue-500",
      "from-emerald-500 to-teal-500",
    ],
    ctaGradient: "from-orange-600 to-amber-600",
    ctaPrimary: "bg-white text-orange-600 hover:bg-orange-50",
    headerBadge: "준비기간 짧은 공고",
  },
  [REPORT_TYPE_LISTING_MARKET_INTEL]: {
    headerGradient: "from-teal-600 via-cyan-600 to-sky-600",
    pageBg: "from-slate-50 via-teal-50/20 to-cyan-50/20",
    alertBorder: "border-l-4 border-teal-500",
    alertBg: "bg-gradient-to-r from-teal-50 to-cyan-50",
    kpiGradients: [
      "from-teal-500 to-cyan-600",
      "from-cyan-500 to-sky-600",
      "from-emerald-500 to-teal-600",
    ],
    chartAccent: "teal",
    rankBadges: [
      "from-teal-400 to-cyan-500",
      "from-slate-300 to-slate-400",
      "from-amber-600 to-amber-700",
    ],
    infoGradients: [
      "from-teal-500 to-cyan-500",
      "from-sky-500 to-blue-500",
      "from-emerald-500 to-teal-500",
    ],
    ctaGradient: "from-teal-600 to-cyan-600",
    ctaPrimary: "bg-white text-teal-600 hover:bg-teal-50",
    headerBadge: "현장거래 시장",
  },
};

const defaultTheme: ReportTheme = {
  headerGradient: "from-purple-600 via-indigo-600 to-blue-600",
  pageBg: "from-slate-50 via-indigo-50/30 to-purple-50/30",
  alertBorder: "border-l-4 border-amber-400",
  alertBg: "bg-gradient-to-r from-amber-50 to-orange-50",
  kpiGradients: [
    "from-purple-500 to-indigo-600",
    "from-indigo-500 to-blue-600",
    "from-emerald-500 to-teal-600",
  ],
  chartAccent: "indigo",
  rankBadges: [
    "from-amber-400 to-yellow-500",
    "from-slate-300 to-slate-400",
    "from-amber-600 to-amber-700",
  ],
  infoGradients: [
    "from-purple-500 to-indigo-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
  ],
  ctaGradient: "from-indigo-600 to-purple-600",
  ctaPrimary: "bg-white text-indigo-600 hover:bg-indigo-50",
};

export function getReportTheme(sourceType: string): ReportTheme {
  return themes[sourceType] ?? defaultTheme;
}
