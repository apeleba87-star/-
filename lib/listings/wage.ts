/**
 * 지급 단위 환산: day / half_day / hour → normalized_daily_wage
 * (DB 트리거에서도 계산하지만, UI/API에서 사용)
 */

import type { PayUnit } from "./types";

export function normalizeToDailyWage(amount: number, payUnit: PayUnit): number {
  switch (payUnit) {
    case "day":
      return amount;
    case "half_day":
      return amount * 2;
    case "hour":
      return amount * 8;
    default:
      return amount;
  }
}

export function normalizeToHourlyWage(amount: number, payUnit: PayUnit): number {
  switch (payUnit) {
    case "day":
      return amount / 8;
    case "half_day":
      return amount / 4;
    case "hour":
      return amount;
    default:
      return amount / 8;
  }
}

export const PAY_UNIT_LABELS: Record<PayUnit, string> = {
  day: "일당",
  half_day: "반당",
  hour: "시급",
};
