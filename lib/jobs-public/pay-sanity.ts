/** 청소·용역 — 월 환산 상식 상한 (비교·정렬·이상치 판별) */
export const PAY_MONTHLY_SANITY_MAX = 8_000_000;

/** 시급(원) 전형 구간 — 최저임금 ~ 3만원대 */
export const HOURLY_WON_TYPICAL_MIN = 8_000;
export const HOURLY_WON_TYPICAL_MAX = 35_000;

const MAN_WON = 10_000;

export type PayAmountFields = {
  sal_tp_cd?: string | null;
  pay_min_won?: number | null;
  pay_max_won?: number | null;
  pay_monthly_normalized?: number | null;
  pay_display?: string | null;
  holiday_label?: string | null;
  title?: string | null;
};

/** pay_display 원문에서 임금형태 추출 */
export function salTpFromPayDisplay(payDisplay: string | null | undefined): string | null {
  const s = (payDisplay ?? "").trim();
  if (!s) return null;
  if (/시급/.test(s)) return "H";
  if (/일당|일급/.test(s)) return "D";
  if (/연봉|연\s/.test(s)) return "Y";
  if (/월급|월\s/.test(s)) return "M";
  return null;
}

/** 만원 단위 월급 오분류 → 시급(원) 역산 */
export function tryRecoverHourlyWonFromStored(storedWon: number): number | null {
  if (!Number.isFinite(storedWon) || storedWon <= 0) return null;

  if (storedWon >= HOURLY_WON_TYPICAL_MIN && storedWon <= HOURLY_WON_TYPICAL_MAX) {
    return Math.round(storedWon);
  }

  if (storedWon >= 1_000_000 && storedWon % MAN_WON === 0) {
    const candidate = storedWon / MAN_WON;
    if (candidate >= HOURLY_WON_TYPICAL_MIN && candidate <= HOURLY_WON_TYPICAL_MAX) {
      return Math.round(candidate);
    }
  }

  return null;
}

export function isMonthlyPayOutlier(monthlyWon: number | null | undefined): boolean {
  return monthlyWon != null && monthlyWon > PAY_MONTHLY_SANITY_MAX;
}

/** 수집·표시 공통 — 보정된 임금형태·원화 금액 */
export function effectivePayAmounts(fields: PayAmountFields): {
  salTpCd: string | null;
  payMinWon: number | null;
  payMaxWon: number | null;
  corrected: boolean;
} {
  let salTpCd = fields.sal_tp_cd ?? null;
  let payMinWon = fields.pay_min_won ?? null;
  let payMaxWon = fields.pay_max_won ?? payMinWon;
  let corrected = false;

  const fromDisplay = salTpFromPayDisplay(fields.pay_display);
  if (fromDisplay) salTpCd = fromDisplay;

  const monthlyNorm = fields.pay_monthly_normalized ?? null;
  const looksWrong =
    isMonthlyPayOutlier(monthlyNorm) ||
    (salTpCd === "M" &&
      payMinWon != null &&
      tryRecoverHourlyWonFromStored(payMinWon) != null);

  if (looksWrong) {
    const recoveredMin = payMinWon != null ? tryRecoverHourlyWonFromStored(payMinWon) : null;
    const recoveredMax =
      payMaxWon != null ? tryRecoverHourlyWonFromStored(payMaxWon) : recoveredMin;

    if (recoveredMin != null) {
      salTpCd = "H";
      payMinWon = recoveredMin;
      payMaxWon = recoveredMax ?? recoveredMin;
      corrected = true;
    }
  }

  if (fromDisplay === "H" && salTpCd !== "H") {
    const min = tryRecoverHourlyWonFromStored(fields.pay_min_won ?? 0);
    if (min != null) {
      salTpCd = "H";
      payMinWon = min;
      payMaxWon =
        fields.pay_max_won != null
          ? tryRecoverHourlyWonFromStored(fields.pay_max_won) ?? min
          : min;
      corrected = true;
    }
  }

  return { salTpCd, payMinWon, payMaxWon, corrected };
}

/** 임금형태 미기재 시 금액만으로 추정 (수집 단계) */
export function resolveSalTpCdByAmount(
  salTpNm: string,
  minRaw: number | null,
  maxRaw: number | null
): string | null {
  const nm = (salTpNm ?? "").toLowerCase();
  const peak = Math.max(minRaw ?? 0, maxRaw ?? 0);

  if (nm.includes("연") || nm.includes("연봉")) return "Y";
  if (nm.includes("월") || nm.includes("월급")) return "M";
  if (nm.includes("일") || nm.includes("일급")) return "D";

  if (nm.includes("시") || nm.includes("시급")) {
    if (peak >= 1_000_000) return "M";
    return "H";
  }

  if (peak >= 10_000_000) return "Y";
  if (peak >= 300_000) return "M";
  if (peak >= HOURLY_WON_TYPICAL_MIN && peak <= HOURLY_WON_TYPICAL_MAX) return "H";
  if (peak >= 100 && peak < HOURLY_WON_TYPICAL_MIN) return "M";
  if (peak >= 30_000 && peak < 300_000) return "D";
  if (peak > 0 && peak < HOURLY_WON_TYPICAL_MIN) return "H";
  return null;
}

/** 수집 후 월 환산이 비현실적이면 시급으로 재해석 */
export function correctIngestPay(params: {
  salTpCd: string | null;
  payMinWon: number | null;
  payMaxWon: number | null;
  payMonthlyNormalized: number | null;
  minRaw: number | null;
  maxRaw: number | null;
  salTpNm: string;
}): {
  salTpCd: string | null;
  payMinWon: number | null;
  payMaxWon: number | null;
} {
  let { salTpCd, payMinWon, payMaxWon, payMonthlyNormalized, minRaw, maxRaw, salTpNm } =
    params;

  if (!isMonthlyPayOutlier(payMonthlyNormalized)) {
    return { salTpCd, payMinWon, payMaxWon };
  }

  const peak = Math.max(minRaw ?? 0, maxRaw ?? 0);
  if (
    peak >= HOURLY_WON_TYPICAL_MIN &&
    peak <= HOURLY_WON_TYPICAL_MAX &&
    !/월|월급/.test(salTpNm)
  ) {
    return {
      salTpCd: "H",
      payMinWon: minRaw != null ? Math.round(minRaw) : payMinWon,
      payMaxWon: maxRaw != null ? Math.round(maxRaw) : payMaxWon,
    };
  }

  const recoveredMin = payMinWon != null ? tryRecoverHourlyWonFromStored(payMinWon) : null;
  if (recoveredMin != null) {
    const recoveredMax =
      payMaxWon != null ? tryRecoverHourlyWonFromStored(payMaxWon) : recoveredMin;
    return {
      salTpCd: "H",
      payMinWon: recoveredMin,
      payMaxWon: recoveredMax ?? recoveredMin,
    };
  }

  return { salTpCd, payMinWon, payMaxWon };
}
