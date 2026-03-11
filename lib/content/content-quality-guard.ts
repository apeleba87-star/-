/**
 * 발행 전 품질 검증: 최소 조건 + 데이터 이상치 검증.
 */

import type { DailyTenderPayload } from "./tender-report-queries";

export type QualityResult = { ok: true } | { ok: false; reason: string };

const MIN_TITLE_LENGTH = 10;
const MIN_BODY_LENGTH = 300;

export function validateDailyReport(
  payload: DailyTenderPayload,
  title: string,
  body: string,
  slug: string
): QualityResult {
  if (payload.count_total < 1) {
    return { ok: false, reason: "count_total must be >= 1" };
  }
  if (title.length < MIN_TITLE_LENGTH) {
    return { ok: false, reason: `title length must be >= ${MIN_TITLE_LENGTH}` };
  }
  if (body.length < MIN_BODY_LENGTH) {
    return { ok: false, reason: `body length must be >= ${MIN_BODY_LENGTH}` };
  }
  if (!slug?.trim()) {
    return { ok: false, reason: "slug is required" };
  }
  if (body.includes("null") || body.includes("undefined")) {
    return { ok: false, reason: "body must not contain null/undefined string" };
  }
  if (payload.source_count !== payload.count_total) {
    return { ok: false, reason: "source_count and count_total mismatch" };
  }

  if (payload.budget_total < 0) {
    return { ok: false, reason: "budget_total must not be negative" };
  }
  const top1 = payload.top_budget_tenders[0];
  if (top1 && payload.budget_total > 0 && top1.budget > payload.budget_total) {
    return { ok: false, reason: "top budget item cannot exceed budget_total" };
  }
  const regionSum = payload.region_breakdown.reduce((s, r) => s + r.count, 0);
  if (regionSum > 0 && Math.abs(regionSum - payload.count_total) > payload.count_total * 0.01) {
    return { ok: false, reason: "region breakdown sum and count_total mismatch" };
  }

  if (
    payload.count_total > 0 &&
    payload.top_budget_tenders.length === 0 &&
    payload.deadline_soon_tenders.length === 0
  ) {
    return { ok: false, reason: "at least one top_budget or deadline_soon item required" };
  }

  return { ok: true };
}
