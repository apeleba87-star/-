/**
 * 입찰 리포트: 제목 + 섹션별 본문 조립. summary 생성 규칙 정형화.
 */

import type { DailyTenderPayload } from "./tender-report-queries";
import { buildRegionSummarySentence, buildInsightSentence } from "./tender-report-formatters";

const SOURCE_TYPE_DAILY = "auto_tender_daily";

/** 마크다운 테이블 셀 내 | 문자 치환 */
function cell(s: string): string {
  return (s ?? "").replace(/\|/g, "·").trim() || "—";
}

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
  const { dateLabel, count_total, budget_total, budget_label, has_budget_unknown } = payload;
  let body = `${dateLabel} 기준, 클린아이덱스가 분류한 청소·소독·방역 관련 공고는 총 **${count_total}건**입니다.`;
  if (budget_total > 0) {
    body += `\n총 추정 예산 규모는 **${budget_label}**입니다.`;
    if (has_budget_unknown) body += "\n\n(일부 공고는 예산 미공개입니다.)";
  } else {
    body += "\n\n공개된 예산 정보가 있는 공고가 없어 총 추정 규모는 집계되지 않았습니다.";
    if (has_budget_unknown) body += " (예산 미공개 공고만 있음)";
    body += "\n";
  }
  return body;
}

export function buildRegionSection(payload: DailyTenderPayload): string {
  const { region_breakdown } = payload;
  const summary = buildRegionSummarySentence(region_breakdown);
  if (!region_breakdown.length) return `## 지역별 분포\n\n${summary}`;
  const header = "| 지역 | 건수 |\n| --- | --- |";
  const rows = region_breakdown.map((r) => `| ${r.name} | ${r.count}건 |`).join("\n");
  return `## 지역별 분포\n\n${summary}\n\n${header}\n${rows}`;
}

export function buildTopBudgetSection(payload: DailyTenderPayload): string {
  const { top_budget_tenders } = payload;
  if (!top_budget_tenders.length) return "## 예산 상위 공고\n\n등록된 공고가 없습니다.";
  const header = "| 순위 | 공고명 | 발주기관 | 예산 | 마감 |\n| --- | --- | --- | --- | --- |";
  const rows = top_budget_tenders.map(
    (t, i) => `| ${i + 1} | ${cell(t.title)} | ${cell(t.agency)} | ${t.budgetLabel} | ${t.deadlineLabel} |`
  );
  return "## 예산 상위 공고\n\n" + header + "\n" + rows.join("\n");
}

export function buildDeadlineSection(payload: DailyTenderPayload): string {
  const { deadline_soon_tenders } = payload;
  if (!deadline_soon_tenders.length) return "## 마감 임박 공고\n\n해당 일자 기준 마감 임박 공고가 없습니다.";
  const header = "| 공고명 | 발주기관 | 마감 |\n| --- | --- | --- |";
  const rows = deadline_soon_tenders.map((t) => `| ${cell(t.title)} | ${cell(t.agency)} | ${t.deadlineLabel} |`);
  return "## 마감 임박 공고\n\n" + header + "\n" + rows.join("\n");
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
    "\n---\n\n클린아이덱스는 청소·소독·방역 관련 공고를 별도로 분류해 매일 업데이트하고 있습니다.",
  ];
  return sections.join("\n\n");
}

export { SOURCE_TYPE_DAILY };
