/**
 * report_snapshots content_full / content_summary → 마크다운 본문.
 * 글 발행 시 post.body 생성용.
 */

import {
  REPORT_TYPE_DEMAND_SALES_REGION,
  type DemandSalesRegionReportContent,
  type ReportContentBlock,
} from "./report-snapshot-types";

function cell(s: string): string {
  return (s ?? "").replace(/\|/g, "·").trim() || "—";
}

function numberLabel(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "데이터 부족";
  return `${Math.round(value).toLocaleString("ko-KR")}${suffix}`;
}

function percentLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "데이터 부족";
  return `${value > 0 ? "+" : ""}${Math.round(value * 10) / 10}%`;
}

function demandSalesRegionToMarkdown(content: DemandSalesRegionReportContent): string {
  const sections: string[] = [];
  sections.push(`# ${content.headline ?? "입주청소 영업지역 리포트"}`);

  if (content.key_metrics?.length) {
    sections.push("## 요약 인사이트\n\n" + content.key_metrics.map((m) => "- " + m).join("\n"));
  }

  if (content.top_regions.length) {
    const rows = content.top_regions
      .map(
        (r) =>
          `| ${r.rank} | ${cell(r.label)} | ${r.score}점 | ${cell(numberLabel(r.searchVolume, "회"))} | ${cell(percentLabel(r.searchMomPercent))} | ${r.saleCount.toLocaleString("ko-KR")}건 | ${r.jeonseCount.toLocaleString("ko-KR")}건 | ${cell(r.recommendation)} |`
      )
      .join("\n");
    sections.push(
      "## 이번 달 입주청소 영업 추천 지역\n\n| 순위 | 지역 | 영업기회점수 | 입주청소 검색량 | 검색량 변화 | 매매 거래 | 전세 거래 | 해석 |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n" +
        rows
    );
  }

  if (content.rising_regions.length) {
    sections.push(
      "## 수요가 올라오는 지역\n\n" +
        content.rising_regions
          .map((r) => `- **${r.label}**: 검색량 변화 ${percentLabel(r.searchMomPercent)}, 영업기회점수 ${r.score}점`)
          .join("\n")
    );
  }

  if (content.caution_regions.length) {
    sections.push(
      "## 검색량은 높지만 주의할 지역\n\n" +
        content.caution_regions
          .map((r) => `- **${r.label}**: 검색량은 ${numberLabel(r.searchVolume, "회")}지만 최근 상승 신호는 제한적입니다.`)
          .join("\n")
    );
  }

  if (content.sales_strategy.length) {
    sections.push("## 청소업체 영업 전략\n\n" + content.sales_strategy.map((s) => "- " + s).join("\n"));
  }

  sections.push("## 점수 산정 기준\n\n" + content.scoring_note);

  if (content.faq.length) {
    sections.push(
      "## FAQ\n\n" +
        content.faq.map((f) => `### ${f.question}\n\n${f.answer}`).join("\n\n")
    );
  }

  sections.push("## 다음 행동\n\n" + content.cta);
  sections.push("\n---\n\n클린아이덱스 입주레이더는 지역별 입주청소 검색량과 RTMS 거래 신호를 함께 추적합니다.");
  return sections.filter(Boolean).join("\n\n");
}

export function reportContentToMarkdown(content: ReportContentBlock & { region_top3?: { name: string; count: number }[] }): string {
  if (
    (content as Partial<DemandSalesRegionReportContent>).report_kind === REPORT_TYPE_DEMAND_SALES_REGION &&
    Array.isArray((content as Partial<DemandSalesRegionReportContent>).top_regions)
  ) {
    return demandSalesRegionToMarkdown(content as DemandSalesRegionReportContent);
  }

  const sections: string[] = [];

  if (content.headline) {
    sections.push("## 한 줄 결론\n\n" + content.headline);
  }

  if (content.key_metrics?.length) {
    sections.push("## 핵심 수치\n\n" + content.key_metrics.map((m) => "- " + m).join("\n"));
  }

  if (content.region_top3?.length) {
    sections.push("## 지역 TOP 3\n\n| 지역 | 건수 |\n| --- | --- |\n" + content.region_top3.map((r) => `| ${cell(r.name)} | ${r.count}건 |`).join("\n"));
  }

  if (content.top3?.length) {
    const rows = (content.top3 as { title?: string; agency?: string; budget?: number; budgetLabel?: string; deadline?: string; deadlineLabel?: string }[]).map(
      (t, i) => `| ${i + 1} | ${cell(t.title ?? "")} | ${cell(t.agency ?? "")} | ${cell(t.budgetLabel ?? (t.budget != null ? String(t.budget) : ""))} | ${cell(t.deadlineLabel ?? t.deadline ?? "")} |`
    );
    sections.push("## 예산 상위 공고 TOP 3\n\n| 순위 | 공고명 | 발주기관 | 예산 | 마감 |\n| --- | --- | --- | --- | --- |\n" + rows.join("\n"));
  }

  if (content.practical_note) {
    sections.push("## 실무 해석\n\n" + content.practical_note);
  }

  if (content.next_action) {
    sections.push("## 다음 행동\n\n" + content.next_action);
  }

  if (content.beneficiary) {
    sections.push("## 유리한 대상\n\n" + content.beneficiary);
  }

  sections.push("\n---\n\n클린아이덱스는 등록 업종 기준 청소·방역 입찰 정보를 제공합니다.");

  return sections.filter(Boolean).join("\n\n");
}
