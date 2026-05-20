/** 만원 단위 */
const MAN_WON = 10_000;

export type NormalizedPay = {
  payMinWon: number | null;
  payMaxWon: number | null;
  /** 급여순 정렬·스냅샷용 (파트타임은 근무일수 반영) */
  payMonthlyNormalized: number | null;
  /** 고용24와 같은 임금 형태 표기 (시급 2만원, 월 268만원 등) */
  payDisplay: string;
  isPayNegotiable: boolean;
  salTpCd: string | null;
};

function parseRawNumber(v: string | null | undefined): number | null {
  const s = (v ?? "").replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function amountToWon(raw: number, salTpCd: string | null): number {
  if (raw >= 1_000_000) return Math.round(raw);
  if (salTpCd === "H" && raw < 100_000) return Math.round(raw);
  if (salTpCd === "D" && raw < 500_000) return Math.round(raw);
  if (raw >= 100 && raw < 10_000) return Math.round(raw * MAN_WON);
  if (raw >= 10_000 && raw < 1_000_000) return Math.round(raw);
  return Math.round(raw * MAN_WON);
}

export function resolveSalTpCd(
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
  if (peak >= 100 && peak < 10_000) return "M";
  if (peak >= 30_000 && peak < 300_000) return "D";
  if (peak > 0 && peak < 30_000) return "H";
  return null;
}

/** 주 N일 근무 등 (고용24 근무형태) */
export function parseDaysPerWeek(
  holidayTpNm?: string | null,
  title?: string | null
): number {
  const blob = [holidayTpNm, title].filter(Boolean).join(" ");
  if (/주\s*2\s*일|주2일/.test(blob)) return 2;
  if (/주\s*3\s*일|주3일/.test(blob)) return 3;
  if (/주\s*6\s*일|주6일/.test(blob)) return 6;
  if (/주\s*5\s*일|주5일/.test(blob)) return 5;
  if (/주말|주\s*1\s*일|주1일/.test(blob)) return 1;
  return 5;
}

const SAL_LABEL: Record<string, string> = {
  H: "시급",
  D: "일당",
  M: "월급",
  Y: "연봉",
};

/** 화면 표기: 고용24 원문과 같은 단위 */
function formatAmountForDisplay(won: number, salTpCd: string | null): string {
  if (won >= MAN_WON) {
    const man = Math.round(won / MAN_WON);
    return `${man.toLocaleString("ko-KR")}만원`;
  }
  return `${won.toLocaleString("ko-KR")}원`;
}

function formatPayDisplayNative(
  salTpCd: string | null,
  payMinWon: number | null,
  payMaxWon: number | null
): string {
  const label = (salTpCd && SAL_LABEL[salTpCd]) || "급여";
  const lo = payMinWon && payMinWon > 0 ? payMinWon : payMaxWon;
  const hi = payMaxWon && payMaxWon > 0 ? payMaxWon : payMinWon;
  if (!lo && !hi) return "급여 협의";
  const a = lo ?? hi!;
  const b = hi ?? lo!;
  if (Math.abs(b - a) < 100) {
    return `${label} ${formatAmountForDisplay(a, salTpCd)}`;
  }
  return `${label} ${formatAmountForDisplay(a, salTpCd)} ~ ${formatAmountForDisplay(b, salTpCd)}`;
}

/** 정렬용 월 환산 — 파트타임·시급은 근무일수 반영 (풀타임 8h×22일 환산 안 함) */
function toMonthlyWonForCompare(
  salTpCd: string | null,
  amountWon: number,
  opts?: { holidayTpNm?: string | null; title?: string | null }
): number {
  if (!amountWon || amountWon <= 0) return 0;
  const daysPerWeek = parseDaysPerWeek(opts?.holidayTpNm, opts?.title);
  const weeksPerMonth = 4.33;
  const hoursPerDay = 8;

  switch (salTpCd) {
    case "Y":
      return Math.round(amountWon / 12);
    case "M":
      return amountWon;
    case "D":
      return Math.round(amountWon * daysPerWeek * weeksPerMonth);
    case "H":
      return Math.round(amountWon * hoursPerDay * daysPerWeek * weeksPerMonth);
    default:
      return amountWon >= 300_000
        ? amountWon
        : Math.round(amountWon * daysPerWeek * weeksPerMonth);
  }
}

export function normalizeWorknetPay(fields: {
  salTpNm?: string | null;
  sal?: string | null;
  minSal?: string | null;
  maxSal?: string | null;
  salTpCd?: string | null;
  holidayTpNm?: string | null;
  title?: string | null;
}): NormalizedPay {
  const salTpNm = (fields.salTpNm ?? fields.sal ?? "").trim();
  const minRaw = parseRawNumber(fields.minSal);
  const maxRaw = parseRawNumber(fields.maxSal) ?? minRaw;

  const salTpCd =
    (fields.salTpCd?.trim() as "D" | "H" | "M" | "Y" | undefined) ||
    resolveSalTpCd(salTpNm, minRaw, maxRaw);

  const payMinWon = minRaw != null ? amountToWon(minRaw, salTpCd) : null;
  const payMaxWon = maxRaw != null ? amountToWon(maxRaw, salTpCd) : payMinWon;

  const compareOpts = { holidayTpNm: fields.holidayTpNm, title: fields.title };
  const monthlyMin =
    payMinWon != null ? toMonthlyWonForCompare(salTpCd, payMinWon, compareOpts) : null;
  const monthlyMax =
    payMaxWon != null ? toMonthlyWonForCompare(salTpCd, payMaxWon, compareOpts) : monthlyMin;

  const payMonthlyNormalized =
    monthlyMax && monthlyMax > 0
      ? monthlyMax
      : monthlyMin && monthlyMin > 0
        ? monthlyMin
        : null;

  const payDisplay = formatPayDisplayNative(salTpCd, payMinWon, payMaxWon);

  if (
    (payMinWon == null || payMinWon <= 0) &&
    (payMaxWon == null || payMaxWon <= 0)
  ) {
    return {
      payMinWon,
      payMaxWon,
      payMonthlyNormalized: null,
      payDisplay: "급여 협의",
      isPayNegotiable: true,
      salTpCd,
    };
  }

  return {
    payMinWon,
    payMaxWon,
    payMonthlyNormalized,
    payDisplay,
    isPayNegotiable: false,
    salTpCd,
  };
}

export function formatDeltaMan(deltaWon: number): string {
  if (deltaWon <= 0) return "같거나 더 낮아요";
  const man = Math.round(deltaWon / MAN_WON);
  return `+${man.toLocaleString("ko-KR")}만원`;
}
