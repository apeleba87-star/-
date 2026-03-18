/**
 * 주간 시장 요약 리포트: WeeklyTenderPayload → content_full / content_summary / content_social.
 */

import type { WeeklyTenderPayload } from "./tender-report-queries";
import { REPORT_TYPE_WEEKLY_MARKET_SUMMARY } from "./report-snapshot-types";
import type { ReportContentBlock } from "./report-snapshot-types";

export type WeeklySummarySnapshot = {
  report_type: typeof REPORT_TYPE_WEEKLY_MARKET_SUMMARY;
  period_key: string;
  title: string;
  content_full: ReportContentBlock & { region_top3?: { name: string; count: number }[] };
  content_summary: ReportContentBlock;
  content_social: string;
};

export function buildWeeklyMarketSummary(payload: WeeklyTenderPayload): WeeklySummarySnapshot | null {
  if (payload.count_total === 0) return null;

  const topRegion = payload.region_breakdown[0];
  const regionTop3 = payload.region_breakdown.slice(0, 3);
  const topIndustry = payload.top_industry?.name ?? "—";

  const headline =
    topRegion && payload.count_total > 0
      ? `이번 주 청소·방역 입찰은 ${topRegion.name} 비중이 높았습니다. 등록 업종 기준 ${payload.count_total}건, 추정 규모 ${payload.budget_label}입니다.`
      : `이번 주 등록 업종 기준 청소·방역 입찰 ${payload.count_total}건, 추정 규모 ${payload.budget_label}입니다.`;

  const beneficiary =
    topRegion && regionTop3.length > 0
      ? "수도권·지역 기반 업체는 해당 지역 공고를 우선 검토하세요."
      : "등록 업종이 맞는 공고를 마감일 순으로 검토하세요.";

  const nextAction = "이번 주 마감 임박 공고부터 확인하고, 지역·업종 필터로 본인에게 맞는 공고를 선별하세요.";

  const keyMetrics = [
    `주간 공고 ${payload.count_total}건`,
    `추정 규모 ${payload.budget_label}`,
    topRegion ? `${topRegion.name} ${topRegion.count}건 (${payload.count_total > 0 ? Math.round((topRegion.count / payload.count_total) * 100) : 0}%)` : "지역 집계 없음",
  ];

  const content_full: WeeklySummarySnapshot["content_full"] = {
    headline,
    key_metrics: keyMetrics,
    top3: payload.top_budget_tenders.slice(0, 3).map((t) => ({
      title: t.title,
      agency: t.agency,
      budget: t.budgetLabel,
      deadline: t.deadlineLabel,
    })),
    region_top3: regionTop3.map((r) => ({ name: r.name, count: r.count })),
    practical_note: `업종 1위: ${topIndustry}. ${beneficiary}`,
    next_action: nextAction,
    proportion: topRegion ? `수도권 비중: ${regionTop3.map((r) => r.name).join(", ")} 순` : undefined,
    beneficiary,
    tags: ["주간시장요약", "등록업종기준"],
  };

  const content_summary: ReportContentBlock = {
    headline,
    key_metrics: keyMetrics,
    top3: content_full.top3,
    practical_note: content_full.practical_note,
    next_action: nextAction,
    beneficiary,
  };

  const content_social =
    payload.count_total > 0
      ? `이번 주 청소·방역 입찰 ${payload.count_total}건, 추정 ${payload.budget_label}. ${topRegion ? `${topRegion.name} 비중 높음.` : ""} 자세한 내용은 리포트에서.`
      : "";

  const title = `${payload.period_label} 청소·방역 입찰 주간 시장 요약`;

  return {
    report_type: REPORT_TYPE_WEEKLY_MARKET_SUMMARY,
    period_key: payload.period_key,
    title,
    content_full,
    content_summary,
    content_social,
  };
}
