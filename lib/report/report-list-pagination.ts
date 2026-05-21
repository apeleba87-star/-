export const REPORT_LIST_PAGE_SIZE = 10;

export function parseReportListPage(raw: string | undefined | null): number {
  const n = parseInt(String(raw ?? "1"), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function reportListPageCount(totalCount: number, pageSize = REPORT_LIST_PAGE_SIZE): number {
  if (totalCount <= 0) return 1;
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export function clampReportListPage(page: number, totalCount: number, pageSize = REPORT_LIST_PAGE_SIZE): number {
  return Math.min(parseReportListPage(String(page)), reportListPageCount(totalCount, pageSize));
}

export function reportListRange(page: number, pageSize = REPORT_LIST_PAGE_SIZE): { from: number; to: number } {
  const safe = Math.max(1, page);
  const from = (safe - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export type ReportListPageItem = number | "ellipsis";

/** 카페 게시판식 페이지 번호 목록 (1 … 8 9 10 … 20) */
export function getReportListPageItems(
  current: number,
  pageCount: number,
  maxVisible = 10,
): ReportListPageItem[] {
  if (pageCount <= 1) return [1];
  if (pageCount <= maxVisible) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const items: ReportListPageItem[] = [];
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = Math.min(pageCount, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    items.push(1);
    if (start > 2) items.push("ellipsis");
  }
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < pageCount) {
    if (end < pageCount - 1) items.push("ellipsis");
    items.push(pageCount);
  }
  return items;
}
