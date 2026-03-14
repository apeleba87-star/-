/**
 * 입찰 리포트: 원화·날짜·지역 문장·인사이트 문장 포맷.
 */

import { formatMoneyMan } from "@/lib/tender-utils";
import type { DailyTenderPayload } from "./tender-report-queries";

export function formatBudgetLabel(value: number): string {
  return formatMoneyMan(value) ?? "—";
}

export function buildRegionSummarySentence(regionBreakdown: { name: string; count: number }[]): string {
  if (!regionBreakdown.length) return "지역별 집계 데이터가 없습니다.";
  const top = regionBreakdown[0];
  return `${top.name} ${top.count}건을 비롯해 ${regionBreakdown.length}개 지역에서 공고가 등록됐습니다.`;
}

export function buildInsightSentence(payload: DailyTenderPayload): string {
  const { count_total, budget_total, region_breakdown, top_budget_tenders, top_industry } = payload;
  if (count_total === 0) return "해당 일자에는 등록된 업종에 해당하는 공고가 없었습니다.";

  const lines: string[] = [];

  if (top_industry && top_industry.count > 0 && count_total > 0) {
    const pct = Math.round((top_industry.count / count_total) * 1000) / 10;
    lines.push(`1위 업종인 ${top_industry.name}이 ${pct}%를 차지했습니다.`);
  }

  const topRegion = region_breakdown[0];
  const topRegionShare = topRegion ? (topRegion.count / count_total) * 100 : 0;
  if (topRegionShare >= 40) {
    lines.push(`오늘 공고는 ${topRegion.name}에 집중되는 흐름을 보였습니다.`);
  } else {
    const top2Sum = region_breakdown.slice(0, 2).reduce((s, r) => s + r.count, 0);
    const top2Share = (top2Sum / count_total) * 100;
    if (top2Share >= 60 && (region_breakdown[0]?.name === "서울" || region_breakdown[1]?.name === "경기")) {
      lines.push("수도권 중심 공고 비중이 높게 나타났습니다.");
    } else {
      lines.push("오늘 공고는 특정 지역 편중 없이 비교적 고르게 분포했습니다.");
    }
  }

  const top1 = top_budget_tenders[0];
  if (top1 && budget_total > 0 && top1.budget / budget_total >= 0.2) {
    lines.push("대형 공고 1건이 전체 예산 규모를 크게 끌어올렸습니다.");
  }

  return lines.length ? lines.join(" ") : "등록 업종 기준 입찰이 안정적으로 등록되고 있습니다.";
}
