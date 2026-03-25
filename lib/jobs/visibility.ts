/**
 * 홈 카드 카운트와 /jobs 목록이 동일 기준을 쓰도록 공통화.
 * - open 상태
 * - work_date가 없거나(today 포함) 미래
 */
export function buildOpenVisibleJobsOrFilter(todayKst: string): string {
  return `work_date.is.null,work_date.gte.${todayKst}`;
}

