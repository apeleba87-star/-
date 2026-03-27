import { addDaysToDateString, getKstTodayString } from "@/lib/jobs/kst-date";

/** 메인 관리 목록 한 페이지 건수 */
export const MANAGE_LIST_PAGE_SIZE = 10;

/** 작업일 기준: 마감 후 이 일수 경과 시 아카이브 */
export const MANAGE_ARCHIVE_WORK_DAYS = 30;

/** 아카이브 판단 시 work_date 없음 마감 글은 updated_at 기준(UTC) */
export function manageArchiveUpdatedBeforeIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - MANAGE_ARCHIVE_WORK_DAYS);
  return d.toISOString();
}

export function manageArchiveWorkDateCutoffKst(): string {
  return addDaysToDateString(getKstTodayString(), -MANAGE_ARCHIVE_WORK_DAYS);
}

/**
 * 메인 내 구인 관리(목록·달력): 아카이브 제외
 * - 모집중(open) 전부
 * - 마감(closed) 중 작업일이 cutoff 이상이거나, 작업일 없으면 최근 updated_at
 */
export function buildActiveJobPostsOrFilter(): string {
  const cutoff = manageArchiveWorkDateCutoffKst();
  const updatedAfter = manageArchiveUpdatedBeforeIso();
  return `status.eq.open,and(status.eq.closed,or(work_date.gte.${cutoff},and(work_date.is.null,updated_at.gte.${updatedAfter})))`;
}

/**
 * 아카이브: status=closed 와 함께 사용. PostgREST or()
 * - 작업일이 cutoff 미만(과거 마감)
 * - 또는 작업일 없음 + 오래된 updated_at
 */
export function buildArchivedClosedOrFilter(): string {
  const cutoff = manageArchiveWorkDateCutoffKst();
  const updatedBefore = manageArchiveUpdatedBeforeIso();
  return `work_date.lt.${cutoff},and(work_date.is.null,updated_at.lt.${updatedBefore})`;
}
