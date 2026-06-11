import { formatReportLinkDate } from "@/lib/report/latest-report-dates";

export type JobWageSharePreview = {
  reportDate: string;
  windowLabel?: string | null;
  dominantCategory?: string | null;
  topProvince?: string | null;
  topAvgWon?: number | null;
  topJobPostCount?: number | null;
};

export type JobWageShareCopy = {
  title: string;
  message: string;
  previewHeadline: string;
  previewDetail: string;
  previewMeta: string | null;
};

function formatWonShort(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** Web Share · 클립보드용 본문 + 카드 미리보기 문구 */
export function buildJobWageShareCopy(preview: JobWageSharePreview): JobWageShareCopy {
  const dateLabel = formatReportLinkDate(preview.reportDate);
  const title = `${dateLabel} 구인 일당 리포트`;

  const detailParts: string[] = [];
  if (preview.dominantCategory?.trim()) {
    detailParts.push(`「${preview.dominantCategory.trim()}」 기준`);
  }
  if (preview.topProvince && preview.topAvgWon != null && preview.topAvgWon > 0) {
    const count =
      preview.topJobPostCount != null && preview.topJobPostCount > 0
        ? ` · 공고 ${preview.topJobPostCount}건`
        : "";
    detailParts.push(`평균 최고 ${preview.topProvince} ${formatWonShort(preview.topAvgWon)}${count}`);
  }

  const previewDetail =
    detailParts.length > 0 ? detailParts.join(" · ") : "시·도별 평균 일당과 당일 신규 공고 스냅샷";

  const message = `${previewDetail}\n${dateLabel} 일당 리포트에서 지역별 단가를 확인하세요.`;

  return {
    title,
    message,
    previewHeadline: title,
    previewDetail,
    previewMeta: preview.windowLabel?.trim() || null,
  };
}

export function jobWageShareClipboardText(copy: JobWageShareCopy, url: string): string {
  return `${copy.message}\n${url}`;
}

/** OG·메타 description */
export function jobWageReportMetaDescription(preview: JobWageSharePreview): string {
  const copy = buildJobWageShareCopy(preview);
  const tail = copy.previewMeta ? ` ${copy.previewMeta}.` : "";
  return `${copy.previewDetail}.${tail} 시·도별 구인 일당 스냅샷 | 클린아이덱스`;
}

/** @deprecated `buildJobWageShareCopy` 사용 */
export function jobWageTeamShareText(reportDateYmd: string): string {
  return buildJobWageShareCopy({ reportDate: reportDateYmd }).message;
}
