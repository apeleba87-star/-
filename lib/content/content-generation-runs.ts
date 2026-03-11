/**
 * content_generation_runs: run_key 계산, 중복 체크, run insert/update.
 * KST 기준 run_key 사용.
 */

import { getKstDateString, getKstWeekKey, getKstMonthKey } from "./kst-utils";

export const GENERATOR_VERSION = "1.0.0";

export type RunType = "daily_tender_digest" | "weekly_tender_report" | "monthly_tender_report";
export type RunStatus = "pending" | "success" | "failed" | "skipped";

export type ContentGenerationRun = {
  id: string;
  run_type: RunType;
  run_key: string;
  status: RunStatus;
  source_count: number | null;
  generated_post_id: string | null;
  payload: Record<string, unknown> | null;
  error_message: string | null;
  attempt_count: number;
  started_at: string | null;
  generator_version: string | null;
  created_at: string;
  finished_at: string | null;
};

export function getRunKey(type: RunType, date?: Date): string {
  switch (type) {
    case "daily_tender_digest":
      return getKstDateString(date);
    case "weekly_tender_report":
      return getKstWeekKey(date);
    case "monthly_tender_report":
      return getKstMonthKey(date);
    default:
      return getKstDateString(date);
  }
}

export function getRunTypeFromApi(type: string): RunType | null {
  if (type === "daily") return "daily_tender_digest";
  if (type === "weekly") return "weekly_tender_report";
  if (type === "monthly") return "monthly_tender_report";
  return null;
}
