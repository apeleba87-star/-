import { isOpeningOpen } from "@/lib/jobs-public-ingest/worknet/closing-parse";

export function isPublicJobStillOpen(
  job: { closing_at: string | null | undefined },
  now = new Date()
): boolean {
  if (!job.closing_at) return true;
  const closingAt = new Date(job.closing_at);
  if (Number.isNaN(closingAt.getTime())) return true;
  return isOpeningOpen(closingAt, now);
}

export function filterOpenPublicJobs<T extends { closing_at: string | null | undefined }>(
  jobs: T[],
  now = new Date()
): T[] {
  return jobs.filter((j) => isPublicJobStillOpen(j, now));
}

/** Supabase `.or()` — 마감일 없음 또는 아직 마감 전 */
export function openClosingOrFilter(now = new Date()): string {
  return `closing_at.is.null,closing_at.gte.${now.toISOString()}`;
}
