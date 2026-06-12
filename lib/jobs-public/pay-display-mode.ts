import {
  parseDaysPerWeek,
  toMonthlyWonForCompare,
} from "@/lib/jobs-public-ingest/worknet/pay-normalize";
import {
  effectivePayAmounts,
  isMonthlyPayOutlier,
  salTpFromPayDisplay,
} from "@/lib/jobs-public/pay-sanity";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";

export type PublicJobPayDisplayMode = "monthly" | "hourly" | "yearly";

export const PUBLIC_JOB_PAY_MODE_OPTIONS: {
  value: PublicJobPayDisplayMode;
  label: string;
}[] = [
  { value: "monthly", label: "월급" },
  { value: "hourly", label: "시급" },
  { value: "yearly", label: "연봉" },
];

export const PUBLIC_JOB_PAY_MODE_STORAGE_KEY = "job_public_pay_mode";

const MODE_PREFIX: Record<PublicJobPayDisplayMode, string> = {
  monthly: "월",
  hourly: "시급",
  yearly: "연",
};

function formatWonAmount(won: number, mode: PublicJobPayDisplayMode): string {
  if (mode === "hourly" && won < 100_000) {
    return `${Math.round(won).toLocaleString("ko-KR")}원`;
  }
  if (won >= 10_000) {
    const man = Math.round(won / 10_000);
    return `${man.toLocaleString("ko-KR")}만원`;
  }
  return `${Math.round(won).toLocaleString("ko-KR")}원`;
}

function monthlyRangeForJob(
  job: PublicJobOpeningListItem
): { min: number; max: number } | null {
  const opts = { holidayTpNm: job.holiday_label, title: job.title };
  const { salTpCd, payMinWon, payMaxWon } = effectivePayAmounts(job);

  let minM: number | null = null;
  let maxM: number | null = null;

  if (payMinWon != null && payMinWon > 0) {
    minM = toMonthlyWonForCompare(salTpCd, payMinWon, opts);
  }
  if (payMaxWon != null && payMaxWon > 0) {
    maxM = toMonthlyWonForCompare(salTpCd, payMaxWon, opts);
  }

  if (minM == null && maxM == null) {
    const norm = job.pay_monthly_normalized;
    if (norm != null && norm > 0 && !isMonthlyPayOutlier(norm)) {
      return { min: norm, max: norm };
    }
    return null;
  }

  const min = minM ?? maxM!;
  const max = maxM ?? minM!;
  if (isMonthlyPayOutlier(min) || isMonthlyPayOutlier(max)) {
    return null;
  }

  return { min, max };
}

function monthlyToHourly(monthlyWon: number, daysPerWeek: number): number {
  const hoursPerMonth = 8 * daysPerWeek * 4.33;
  if (hoursPerMonth <= 0) return 0;
  return Math.round(monthlyWon / hoursPerMonth);
}

function monthlyToYearly(monthlyWon: number): number {
  return Math.round(monthlyWon * 12);
}

function formatPayRange(
  minWon: number,
  maxWon: number,
  mode: PublicJobPayDisplayMode,
  daysPerWeek: number
): string {
  const prefix = MODE_PREFIX[mode];
  const convert = (m: number) => {
    if (mode === "monthly") return m;
    if (mode === "yearly") return monthlyToYearly(m);
    return monthlyToHourly(m, daysPerWeek);
  };

  const lo = convert(minWon);
  const hi = convert(maxWon);

  if (!lo && !hi) return PUBLIC_JOBS_COPY.payNegotiable;
  if (Math.abs(hi - lo) < (mode === "hourly" ? 100 : 10_000)) {
    return `${prefix} ${formatWonAmount(lo || hi, mode)}`;
  }
  return `${prefix} ${formatWonAmount(lo, mode)} ~ ${formatWonAmount(hi, mode)}`;
}

/** 목록·스포트라이트 — 선택 단위(기본 월급)로 급여 표기 */
export function formatJobPayForMode(
  job: PublicJobOpeningListItem,
  mode: PublicJobPayDisplayMode = "monthly"
): string {
  const monthly = monthlyRangeForJob(job);
  if (!monthly) {
    const native = job.pay_display?.trim();
    if (native && native !== PUBLIC_JOBS_COPY.payNegotiable) {
      const nativeTp = salTpFromPayDisplay(native);
      if (nativeTp === "H" && mode === "hourly") return native;
      if (nativeTp === "M" && mode === "monthly") return native;
      if (nativeTp === "Y" && mode === "yearly") return native;
      if (isMonthlyPayOutlier(job.pay_monthly_normalized)) return native;
    }
    return native || PUBLIC_JOBS_COPY.payNegotiable;
  }
  const daysPerWeek = parseDaysPerWeek(job.holiday_label, job.title);
  return formatPayRange(monthly.min, monthly.max, mode, daysPerWeek);
}

export function parsePublicJobPayMode(raw: unknown): PublicJobPayDisplayMode {
  if (raw === "hourly" || raw === "yearly" || raw === "monthly") return raw;
  return "monthly";
}

export function loadPublicJobPayMode(): PublicJobPayDisplayMode {
  if (typeof window === "undefined") return "monthly";
  try {
    return parsePublicJobPayMode(localStorage.getItem(PUBLIC_JOB_PAY_MODE_STORAGE_KEY));
  } catch {
    return "monthly";
  }
}
