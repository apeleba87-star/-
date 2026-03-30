/** 카드·헤드라인용: `준공/인테리어 청소` → `준공 인테리어 청소` */
export function formatJobWageDominantDisplayName(name: string): string {
  return name
    .trim()
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 목록·상단 요약: 정상 집계(시·도별 공고 있음)일 때만 친숙한 한 줄, 아니면 저장된 headline */
export function jobWageReportListExcerptFromPayload(payload: unknown, fallbackHeadline: string): string {
  if (payload == null || typeof payload !== "object") return fallbackHeadline;
  const o = payload as { dominantCategory?: { name?: string } | null; jobPostCount?: unknown };
  const raw = (o.dominantCategory?.name ?? "").trim();
  const jpc = typeof o.jobPostCount === "number" && Number.isFinite(o.jobPostCount) ? o.jobPostCount : 0;
  if (!raw || jpc <= 0) return fallbackHeadline;
  return `${formatJobWageDominantDisplayName(raw)}가 가장 많았어요`;
}
