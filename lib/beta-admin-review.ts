/** 관리자 베타 지원 검수 — 상태 라벨·태그 프리셋 */

export const BETA_REVIEW_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "on_hold",
  "rejected",
  "converted",
] as const;

export type BetaReviewStatus = (typeof BETA_REVIEW_STATUSES)[number];

export const BETA_REVIEW_STATUS_LABELS: Record<BetaReviewStatus, string> = {
  new: "신규",
  contacted: "연락함",
  qualified: "적합(ICP)",
  on_hold: "보류",
  rejected: "부적합",
  converted: "전환(가입 등)",
};

export const BETA_REVIEW_TAG_PRESETS = [
  "ICP-A",
  "고통강함",
  "카톡기록",
  "미수경험",
  "직원다수",
  "후속콜",
  "우선연락",
] as const;

export function isBetaReviewStatus(s: string): s is BetaReviewStatus {
  return (BETA_REVIEW_STATUSES as readonly string[]).includes(s);
}

/** 쉼표·줄바꿈 구분 태그 정리 (최대 24개, 각 48자) */
export function parseReviewTagsInput(raw: string): string[] {
  const parts = raw
    .split(/[,，\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const cut = p.slice(0, 48);
    if (seen.has(cut)) continue;
    seen.add(cut);
    out.push(cut);
    if (out.length >= 24) break;
  }
  return out;
}
