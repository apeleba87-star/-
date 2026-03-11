/**
 * 입찰 리포트: 제목 + 섹션별 본문 조립. summary 생성 규칙 정형화.
 */

import type { DailyTenderPayload } from "./tender-report-queries";
import { buildRegionSummarySentence, buildInsightSentence } from "./tender-report-formatters";

const SOURCE_TYPE_DAILY = "auto_tender_daily";

export function buildDailySlug(sourceRef: string): string {
  return `${sourceRef}-daily-tender-digest`;
}

export function buildDailyTitle(payload: DailyTenderPayload): string {
  return `${payload.dateLabel} 청소·소독·방역 입찰 ${payload.count_total}건 정리`;
}

/** 뉴스레터/카드용 summary 1문장 (정형화 규칙) */
export function getDailySummaryText(payload: DailyTenderPayload): string {
  return `오늘 등록된 청소·소독·방역 입찰 ${payload.count_total}건과 예산 상위 공고를 정리했습니다.`;
}

export function buildSummarySection(payload: DailyTenderPayload): string {
  const { dateLabel, count_total, budget_label, has_budget_unknown } = payload;
  let body = `${dateLabel} 기준, 클린인덱스가 분류한 청소·소독·방역 관련 공고는 총 **${count_total}건**입니다.\n총 추정 예산 규모는 **${budget_label}**입니다.`;
  if (has_budget_unknown) {
    body += "\n\n(일부 공고는 예산 미공개입니다.)";
  }
  return body;
}

export function buildRegionSection(payload: DailyTenderPayload): string {
  const { region_breakdown } = payload;
  const summary = buildRegionSummarySentence(region_breakdown);
  if (!region_breakdown.length) return `## 지역별 분포\n\n${summary}`;
  const lines = region_breakdown.map((r) => `- ${r.name}: ${r.count}건`).join("\n");
  return `## 지역별 분포\n\n${summary}\n\n${lines}`;
}

export function buildTopBudgetSection(payload: DailyTenderPayload): string {
  const { top_budget_tenders } = payload;
  if (!top_budget_tenders.length) return "## 예산 상위 공고\n\n등록된 공고가 없습니다.";
  const lines = top_budget_tenders.map(
    (t, i) => `${i + 1}. ${t.title} — ${t.agency} / ${t.budgetLabel} (마감: ${t.deadlineLabel})`
  );
  return "## 예산 상위 공고\n\n" + lines.join("\n\n");
}

export function buildDeadlineSection(payload: DailyTenderPayload): string {
  const { deadline_soon_tenders } = payload;
  if (!deadline_soon_tenders.length) return "## 마감 임박 공고\n\n해당 일자 기준 마감 임박 공고가 없습니다.";
  const lines = deadline_soon_tenders.map(
    (t) => `- ${t.title} — ${t.agency} (마감: ${t.deadlineLabel})`
  );
  return "## 마감 임박 공고\n\n" + lines.join("\n\n");
}

export function buildInsightSection(payload: DailyTenderPayload): string {
  const insight = buildInsightSentence(payload);
  return `## 한줄 해석\n\n${insight}`;
}

export function buildDailyBody(payload: DailyTenderPayload): string {
  const sections = [
    "## 오늘의 청소 입찰 요약",
    buildSummarySection(payload),
    buildRegionSection(payload),
    buildTopBudgetSection(payload),
    buildDeadlineSection(payload),
    buildInsightSection(payload),
    "\n---\n\n클린인덱스는 청소·소독·방역 관련 공고를 별도로 분류해 매일 업데이트하고 있습니다.",
  ];
  return sections.join("\n\n");
}

export { SOURCE_TYPE_DAILY };
