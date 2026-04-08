/**
 * 리포트 스냅샷: report_type 상수 및 화면/글 발행 시 표기용 라벨.
 * 낙찰률·기관유형 리포트는 제외 (계약 수집·institution_type 미구현).
 */

export const REPORT_TYPE_WEEKLY_MARKET_SUMMARY = "weekly_market_summary";
export const REPORT_TYPE_DEADLINE_SOON = "deadline_soon";
export const REPORT_TYPE_OPENING_SCHEDULED = "opening_scheduled";
export const REPORT_TYPE_LARGE_TENDER_TOP = "large_tender_top";
export const REPORT_TYPE_PREP_SHORT = "prep_short";
export const REPORT_TYPE_REGION_MARKET = "region_market";
export const REPORT_TYPE_REBID_INSTITUTIONS = "rebid_institutions";
export const REPORT_TYPE_CONTRACT_METHOD = "contract_method";
export const REPORT_TYPE_LICENSE_LIMIT = "license_limit";
export const REPORT_TYPE_NATIONWIDE_VS_REGIONAL = "nationwide_vs_regional";
export const REPORT_TYPE_REPEAT_ORDERING = "repeat_ordering";
export const REPORT_TYPE_REGION_INSTITUTION = "region_institution";
export const REPORT_TYPE_LISTING_MARKET_INTEL = "listing_market_intel";
export const REPORT_TYPE_AWARD_MARKET_INTEL = "award_market_intel";

export type ReportType =
  | typeof REPORT_TYPE_WEEKLY_MARKET_SUMMARY
  | typeof REPORT_TYPE_DEADLINE_SOON
  | typeof REPORT_TYPE_OPENING_SCHEDULED
  | typeof REPORT_TYPE_LARGE_TENDER_TOP
  | typeof REPORT_TYPE_PREP_SHORT
  | typeof REPORT_TYPE_REGION_MARKET
  | typeof REPORT_TYPE_REBID_INSTITUTIONS
  | typeof REPORT_TYPE_CONTRACT_METHOD
  | typeof REPORT_TYPE_LICENSE_LIMIT
  | typeof REPORT_TYPE_NATIONWIDE_VS_REGIONAL
  | typeof REPORT_TYPE_REPEAT_ORDERING
  | typeof REPORT_TYPE_REGION_INSTITUTION
  | typeof REPORT_TYPE_LISTING_MARKET_INTEL
  | typeof REPORT_TYPE_AWARD_MARKET_INTEL;

/** 화면/글 목록에 표시할 리포트 유형 라벨 (입찰리포트가 아닌 유형명) */
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [REPORT_TYPE_WEEKLY_MARKET_SUMMARY]: "주간시장요약 리포트",
  [REPORT_TYPE_DEADLINE_SOON]: "마감 임박 리포트",
  [REPORT_TYPE_OPENING_SCHEDULED]: "개찰 예정 리포트",
  [REPORT_TYPE_LARGE_TENDER_TOP]: "대형 공고 TOP 리포트",
  [REPORT_TYPE_PREP_SHORT]: "준비기간 짧은 공고 리포트",
  [REPORT_TYPE_REGION_MARKET]: "지역 시장 리포트",
  [REPORT_TYPE_REBID_INSTITUTIONS]: "재공고 많은 기관 리포트",
  [REPORT_TYPE_CONTRACT_METHOD]: "계약방법별 리포트",
  [REPORT_TYPE_LICENSE_LIMIT]: "면허·업종 제한 리포트",
  [REPORT_TYPE_NATIONWIDE_VS_REGIONAL]: "전국 vs 지역제한 리포트",
  [REPORT_TYPE_REPEAT_ORDERING]: "반복 발주 기관 리포트",
  [REPORT_TYPE_REGION_INSTITUTION]: "지역·기관 결합 리포트",
  [REPORT_TYPE_LISTING_MARKET_INTEL]: "현장거래 시장 인텔리전스",
  [REPORT_TYPE_AWARD_MARKET_INTEL]: "낙찰 시장 인텔리전스",
};

/** posts.source_type 에 저장할 값 (글 발행 시) */
export function reportTypeToSourceType(reportType: ReportType): string {
  return reportType;
}

export function getReportTypeLabel(reportType: string): string {
  return REPORT_TYPE_LABELS[reportType as ReportType] ?? "리포트";
}

/** content_full / content_summary 공통 구조 (타입 힌트) */
export type ReportContentBlock = {
  headline?: string;
  key_metrics?: string[];
  top3?: unknown[];
  practical_note?: string;
  next_action?: string;
  comparison?: string;
  proportion?: string;
  beneficiary?: string;
  /**
   * 데이터 신뢰(표본/출처 등) 메타.
   * 문자열 파싱에 의존하지 않기 위해 구조화해서 내려보냅니다.
   */
  data_trust?: {
    source?: string;
    sample_count?: number;
  };
  tags?: string[];
};
