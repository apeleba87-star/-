export const PUBLIC_JOB_PAGE_SIZE = 15;

export function parsePublicJobPage(raw: string | null | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function publicJobPageCount(totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.ceil(totalCount / PUBLIC_JOB_PAGE_SIZE);
}

export function clampPublicJobPage(page: number, totalCount: number): number {
  const max = publicJobPageCount(totalCount);
  if (max === 0) return 1;
  return Math.min(Math.max(1, page), max);
}

export function slicePublicJobPage<T>(items: T[], page: number): T[] {
  const start = (page - 1) * PUBLIC_JOB_PAGE_SIZE;
  return items.slice(start, start + PUBLIC_JOB_PAGE_SIZE);
}
