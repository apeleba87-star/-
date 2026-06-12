import {
  effectivePayAmounts,
  isMonthlyPayOutlier,
  salTpFromPayDisplay,
} from "@/lib/jobs-public/pay-sanity";
import { toMonthlyWonForCompare } from "@/lib/jobs-public-ingest/worknet/pay-normalize";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";

/** 정렬·스포트라이트 — 보정된 월 환산액 */
export function comparePayMonthlyNormalized(job: PublicJobOpeningListItem): number {
  const { salTpCd, payMinWon, payMaxWon } = effectivePayAmounts(job);
  const opts = { holidayTpNm: job.holiday_label, title: job.title };

  let monthly: number | null = null;
  if (payMaxWon != null && payMaxWon > 0) {
    monthly = toMonthlyWonForCompare(salTpCd, payMaxWon, opts);
  }
  if (payMinWon != null && payMinWon > 0) {
    const fromMin = toMonthlyWonForCompare(salTpCd, payMinWon, opts);
    monthly = monthly != null ? Math.max(monthly, fromMin) : fromMin;
  }

  if (monthly != null && monthly > 0 && !isMonthlyPayOutlier(monthly)) {
    return monthly;
  }

  const norm = job.pay_monthly_normalized;
  if (norm != null && norm > 0 && !isMonthlyPayOutlier(norm)) {
    return norm;
  }

  return -1;
}
