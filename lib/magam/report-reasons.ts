export const MAGAM_REPORT_REASON_TYPES = [
  "illegal",
  "fake",
  "spam",
  "harassment",
  "other",
] as const;

export type MagamReportReasonType = (typeof MAGAM_REPORT_REASON_TYPES)[number];

export const MAGAM_REPORT_REASON_LABEL: Record<MagamReportReasonType, string> = {
  illegal: "불법·부적절 구인",
  fake: "허위 공고",
  spam: "스팸·도배",
  harassment: "연락처 도용·괴롭힘",
  other: "기타",
};

export const MAGAM_REPORT_STATUS_LABEL: Record<"pending" | "dismissed" | "actioned", string> = {
  pending: "대기",
  dismissed: "기각",
  actioned: "조치 완료",
};
