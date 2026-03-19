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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** 주간 시장 요약 실무 해석 2종 (optional은 마지막) */
const WEEKLY_SUMMARY_PRACTICAL_NOTES: ((
  count: number,
  budgetLabel: string,
  topIndustry: string,
  topRegionName?: string
) => string)[] = [
  (count, budgetLabel, topIndustry, topRegionName) =>
    topRegionName
      ? `이번 주 등록 업종 기준 청소·방역 입찰은 ${count}건, 추정 규모 ${budgetLabel}이며, 지역별로는 ${topRegionName} 비중이 높았습니다. 업종 1위는 ${topIndustry}입니다. 해당 지역·업종에 강점이 있는 업체는 마감 임박 공고를 우선 검토하고, 지역·업종 필터로 본인에게 맞는 공고를 선별하시면 됩니다.`
      : `이번 주 등록 업종 기준 청소·방역 입찰은 ${count}건, 추정 규모 ${budgetLabel}이며, 업종 1위는 ${topIndustry}입니다. 마감일 순으로 마감 임박 공고를 확인하고, 지역·업종 필터로 참여 가능 공고를 선별하시기 바랍니다.`,
  (count, budgetLabel, _topIndustry, topRegionName) =>
    topRegionName
      ? `주간 공고 ${count}건, 추정 규모 ${budgetLabel}이며 ${topRegionName} 등 지역 편중이 있습니다. 지역 기반 업체는 해당 지역 공고를, 그 외에는 마감 임박·대형 공고 순으로 검토하시면 실무에 도움이 됩니다.`
      : `이번 주 주간 공고 ${count}건, 추정 규모 ${budgetLabel}입니다. 마감 임박 공고부터 확인한 뒤, 지역·업종에 맞는 공고를 선별해 검토하시기 바랍니다.`,
];

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

  const practical_note = pickRandom(WEEKLY_SUMMARY_PRACTICAL_NOTES)(
    payload.count_total,
    payload.budget_label,
    topIndustry,
    topRegion?.name
  );

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
    practical_note,
    next_action: nextAction,
    proportion: topRegion ? `수도권 비중: ${regionTop3.map((r) => r.name).join(", ")} 순` : undefined,
    beneficiary,
    data_trust: {
      source: "나라장터 G2B(입찰 데이터 집계)",
      sample_count: payload.count_total,
    },
    tags: ["주간시장요약", "등록업종기준"],
  };

  const content_summary: ReportContentBlock = {
    headline,
    key_metrics: keyMetrics,
    top3: content_full.top3,
    practical_note: content_full.practical_note,
    next_action: nextAction,
    beneficiary,
    data_trust: {
      source: "나라장터 G2B(입찰 데이터 집계)",
      sample_count: payload.count_total,
    },
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
