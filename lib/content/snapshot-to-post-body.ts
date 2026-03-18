/**
 * report_snapshots content_full / content_summary → 마크다운 본문.
 * 글 발행 시 post.body 생성용.
 */

import type { ReportContentBlock } from "./report-snapshot-types";

function cell(s: string): string {
  return (s ?? "").replace(/\|/g, "·").trim() || "—";
}

export function reportContentToMarkdown(content: ReportContentBlock & { region_top3?: { name: string; count: number }[] }): string {
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
