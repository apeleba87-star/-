import type { HomeAdSlotKey } from "@/lib/ads-shared";

export type AdPlacementSurfaceId =
  | "demand"
  | "tender_report"
  | "tender_list"
  | "tender_detail"
  | "awards_list"
  | "award_report"
  | "estimate"
  | "marketing"
  | "job_wage"
  | "jobs_public"
  | "all";

export type AdPlacementBlockKind = "chrome" | "affiliate_slot" | "radar_direct";

export type AdPlacementBlock = {
  id: string;
  kind: AdPlacementBlockKind;
  label: string;
  detail?: string;
  slotKey?: HomeAdSlotKey;
  /** 입주레이더 직거래 — /admin/radar-ads 에서 관리 */
  radarDirectHref?: string;
};

export type AdPlacementSurface = {
  id: AdPlacementSurfaceId;
  label: string;
  pageLabel: string;
  pagePath: string;
  previewHref?: string;
  blocks: AdPlacementBlock[];
};

export const AD_PLACEMENT_SURFACES: AdPlacementSurface[] = [
  {
    id: "demand",
    label: "입주레이더",
    pageLabel: "입주레이더 허브",
    pagePath: "/demand",
    previewHref: "/demand",
    blocks: [
      { id: "demand-pulse", kind: "chrome", label: "전국 펄스 (일일 지표)" },
      {
        id: "demand-national-direct",
        kind: "radar_direct",
        label: "전국 직거래 배너",
        detail: "펄스 아래 · 지역 찾기 위 · 항상 노출",
        radarDirectHref: "/admin/radar-ads/manage?section=national",
      },
      { id: "demand-picker", kind: "chrome", label: "지역 찾기" },
      { id: "demand-summary", kind: "chrome", label: "지표 요약 · 비교 카드" },
      {
        id: "demand-regional-direct",
        kind: "radar_direct",
        label: "지역 직거래 배너",
        detail: "비교 카드 아래 · 선택 지역 기준 (1순위)",
        radarDirectHref: "/admin/radar-ads/manage?section=regional",
      },
      {
        id: "demand-regional-fallback",
        kind: "affiliate_slot",
        label: "지역 제휴 대체",
        detail: "지역 직거래 없을 때 · 비교 카드 아래",
        slotKey: "radar_regional_fallback",
      },
      { id: "demand-chart", kind: "chrome", label: "지표 그래프" },
      {
        id: "demand-empty",
        kind: "affiliate_slot",
        label: "지역 미선택 빈 화면",
        detail: "지역을 아직 고르지 않았을 때",
        slotKey: "radar_empty_state",
      },
      {
        id: "demand-table-below",
        kind: "affiliate_slot",
        label: "지표 표 아래 (PC·로그인)",
        detail: "데스크톱 비교표 아래",
        slotKey: "radar_table_below",
      },
      {
        id: "demand-pulse-below-legacy",
        kind: "affiliate_slot",
        label: "펄스 아래 (레거시)",
        detail: "현재 허브는 전국 직거래 사용 · 미사용 권장",
        slotKey: "radar_pulse_below",
      },
    ],
  },
  {
    id: "tender_report",
    label: "입찰 리포트",
    pageLabel: "입찰 일일 리포트",
    pagePath: "/posts/[id]",
    blocks: [
      { id: "tr-glance", kind: "chrome", label: "한눈에 보기" },
      {
        id: "tr-glance-ad",
        kind: "affiliate_slot",
        label: "한눈에 보기 아래",
        slotKey: "tender_report_glance_below",
      },
      { id: "tr-budget", kind: "chrome", label: "예산 상위 공고" },
      {
        id: "tr-budget-ad",
        kind: "affiliate_slot",
        label: "예산 블록 아래",
        slotKey: "tender_report_budget_below",
      },
      { id: "tr-premium", kind: "chrome", label: "프리미엄 당일 핵심" },
      {
        id: "tr-premium-ad",
        kind: "affiliate_slot",
        label: "프리미엄 핵심 아래",
        slotKey: "tender_report_premium_core_below",
      },
    ],
  },
  {
    id: "tender_list",
    label: "입찰 목록",
    pageLabel: "입찰 공고 목록",
    pagePath: "/tenders",
    previewHref: "/tenders",
    blocks: [
      { id: "tl-list", kind: "chrome", label: "업종 필터 진행 공고 목록" },
      {
        id: "tl-3rd",
        kind: "affiliate_slot",
        label: "목록 3번째 항목",
        detail: "업종 필터 적용 시 3번째 카드 위치",
        slotKey: "tenders_industry_open_3rd",
      },
    ],
  },
  {
    id: "tender_detail",
    label: "입찰 상세",
    pageLabel: "입찰 공고 상세",
    pagePath: "/tenders/[id]",
    blocks: [
      { id: "td-summary", kind: "chrome", label: "요약·개요" },
      {
        id: "td-summary-ad",
        kind: "affiliate_slot",
        label: "요약 아래",
        slotKey: "tender_detail_summary_below",
      },
      { id: "td-strategy", kind: "chrome", label: "전략·분석" },
      {
        id: "td-strategy-ad",
        kind: "affiliate_slot",
        label: "전략 섹션 아래",
        slotKey: "tender_detail_strategy_below",
      },
    ],
  },
  {
    id: "awards_list",
    label: "낙찰 목록",
    pageLabel: "낙찰 목록",
    pagePath: "/tender-awards",
    previewHref: "/tender-awards",
    blocks: [
      { id: "al-list", kind: "chrome", label: "업종 필터 낙찰 목록" },
      {
        id: "al-3rd",
        kind: "affiliate_slot",
        label: "목록 3번째 항목",
        slotKey: "awards_industry_list_3rd",
      },
    ],
  },
  {
    id: "award_report",
    label: "낙찰 리포트",
    pageLabel: "낙찰 일일 리포트",
    pagePath: "/posts/[id]",
    blocks: [
      {
        id: "ar-top-above",
        kind: "affiliate_slot",
        label: "상위 낙찰 위",
        slotKey: "award_report_top_awards_above",
      },
      { id: "ar-metrics", kind: "chrome", label: "핵심 지표" },
      {
        id: "ar-metrics-below",
        kind: "affiliate_slot",
        label: "핵심 지표 아래",
        slotKey: "award_report_key_metrics_below",
      },
    ],
  },
  {
    id: "estimate",
    label: "견적",
    pageLabel: "청소 견적 계산기",
    pagePath: "/estimate",
    previewHref: "/estimate",
    blocks: [
      { id: "est-form", kind: "chrome", label: "견적 입력·결과" },
      {
        id: "est-below",
        kind: "affiliate_slot",
        label: "분석 결과 아래",
        slotKey: "estimate_analyze_below",
      },
    ],
  },
  {
    id: "marketing",
    label: "마케팅 리포트",
    pageLabel: "마케팅 일일 리포트",
    pagePath: "/marketing-report/[date]",
    previewHref: "/marketing-report",
    blocks: [
      {
        id: "mr-top",
        kind: "affiliate_slot",
        label: "본문 상단",
        slotKey: "report_top",
      },
      { id: "mr-titles", kind: "chrome", label: "추천 제목 1·2" },
      {
        id: "mr-titles-ad",
        kind: "affiliate_slot",
        label: "추천 제목 사이",
        slotKey: "marketing_report_suggested_titles_1_2",
      },
      {
        id: "mr-bottom",
        kind: "affiliate_slot",
        label: "본문 하단",
        slotKey: "report_bottom",
      },
    ],
  },
  {
    id: "job_wage",
    label: "일당 리포트",
    pageLabel: "구인 일당 일일 리포트",
    pagePath: "/job-market-report/[date]",
    previewHref: "/job-market-report",
    blocks: [
      {
        id: "jw-national-direct",
        kind: "radar_direct",
        label: "전국 직거래 배너",
        detail: "높음·낮음 요약 아래 · 지도 위 · 입주레이더 전국과 동일 캠페인",
        radarDirectHref: "/admin/radar-ads/manage?section=national",
      },
      {
        id: "jw-top",
        kind: "affiliate_slot",
        label: "본문 상단",
        slotKey: "report_top",
      },
      { id: "jw-summary", kind: "chrome", label: "대표 직종 · 시·도 요약" },
      { id: "jw-map", kind: "chrome", label: "시·도별 지도 · 표" },
      {
        id: "jw-bottom",
        kind: "affiliate_slot",
        label: "본문 하단",
        slotKey: "report_bottom",
      },
    ],
  },
  {
    id: "jobs_public",
    label: "청소·용역 채용",
    pageLabel: "채용 공고 상세",
    pagePath: "/jobs/public/[id]",
    previewHref: "/jobs/public",
    blocks: [
      { id: "jp-detail-header", kind: "chrome", label: "공고명 · 급여 · 지역 요약" },
      { id: "jp-detail-checklist", kind: "chrome", label: "지원 전 더 확인 (접기)" },
      {
        id: "jp-detail-regional-radar",
        kind: "chrome",
        label: "지역 직거래 배너 (확인 아래)",
        detail: "입주레이더 지역 API",
      },
      {
        id: "jp-detail-summary-ad",
        kind: "affiliate_slot",
        label: "지역 배너 아래 · 지원 CTA 위",
        slotKey: "jobs_public_detail_summary_below",
      },
      { id: "jp-detail-cta", kind: "chrome", label: "고용24 지원 CTA" },
      {
        id: "jp-detail-national-radar",
        kind: "radar_direct",
        label: "전국 직거래 배너",
        detail: "지원 CTA 아래 · 입주레이더 전국과 동일",
        radarDirectHref: "/admin/radar-ads/manage?section=national",
      },
      {
        id: "jp-detail-related-ad",
        kind: "affiliate_slot",
        label: "같은 지역 공고 위",
        slotKey: "jobs_public_detail_related_above",
      },
      { id: "jp-detail-related", kind: "chrome", label: "같은 지역 다른 공고" },
    ],
  },
];

const SURFACE_TABS = AD_PLACEMENT_SURFACES.filter((s) => s.id !== "all");

export function getAdPlacementSurfacesForTabs(): AdPlacementSurface[] {
  return SURFACE_TABS;
}

export function getAdPlacementSurface(id: AdPlacementSurfaceId): AdPlacementSurface | undefined {
  if (id === "all") return undefined;
  return AD_PLACEMENT_SURFACES.find((s) => s.id === id);
}

export function placementForSlotKey(key: string): {
  surface: AdPlacementSurface;
  block: AdPlacementBlock;
} | null {
  for (const surface of AD_PLACEMENT_SURFACES) {
    for (const block of surface.blocks) {
      if (block.slotKey === key) return { surface, block };
    }
  }
  return null;
}

export const SLOT_TYPE_LABELS: Record<string, string> = {
  direct: "직접 수주",
  coupang_api: "쿠팡 API",
  google: "구글",
  coupang: "쿠팡 스크립트",
};
