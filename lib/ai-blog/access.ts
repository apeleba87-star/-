import { kstToday } from "@/lib/ai-blog/stats";
import type { AiAccess } from "@/lib/ai-blog/types";

export type AccessRow = { plan_code: string; status: string; expires_on: string };

export const EXPIRY_WARNING_DAYS = 7;

/** 사이트 관리자는 기간 없이 항상 사용 가능 */
export const SITE_ADMIN_ACCESS: AiAccess = { state: "active", plan_code: null, expires_on: null, days_left: null };

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function computeAccess(row: AccessRow | null, today = kstToday()): AiAccess {
  if (!row) return { state: "none", plan_code: null, expires_on: null, days_left: null };
  const daysLeft = daysBetween(today, row.expires_on);
  const state = row.status === "suspended" ? "suspended" : daysLeft < 0 ? "expired" : "active";
  return { state, plan_code: row.plan_code, expires_on: row.expires_on, days_left: daysLeft };
}
