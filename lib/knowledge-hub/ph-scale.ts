/**
 * pH 스케일 색상·라벨 — 0(강산)~14(강알칼리) 표준 스펙트럼
 * 제품 원액 pH를 우선해 색·성질을 고정한다.
 */

export type PhBand =
  | "strong-acid"
  | "weak-acid"
  | "neutral"
  | "weak-alkali"
  | "strong-alkali";

export type PhInfo = {
  /** 표시용 수치 (소수 있으면 그대로) */
  value: number;
  /** 배지용 짧은 숫자 문자열 */
  valueLabel: string;
  band: PhBand;
  /** 약산성 / 중성 / 약알칼리 등 */
  natureLabel: string;
  /** 스케일 색 (hex) */
  color: string;
  /** 배지 글자색 */
  textColor: string;
};

/** 0–14 정수에 맞춘 스펙트럼 (산성 빨강 → 중성 초록 → 알칼리 파랑·보라) */
const PH_COLORS: readonly string[] = [
  "#E53935", // 0
  "#F4511E", // 1
  "#FB8C00", // 2
  "#F9A825", // 3
  "#FDD835", // 4
  "#C0CA33", // 5
  "#7CB342", // 6
  "#43A047", // 7
  "#00897B", // 8
  "#039BE5", // 9
  "#1E88E5", // 10
  "#3949AB", // 11
  "#5E35B1", // 12
  "#8E24AA", // 13
  "#6A1B9A", // 14
];

function clampPh(n: number): number {
  if (Number.isNaN(n)) return 7;
  return Math.min(14, Math.max(0, n));
}

export function phColor(value: number): string {
  const v = clampPh(value);
  const lo = Math.floor(v);
  const hi = Math.min(14, Math.ceil(v));
  if (lo === hi) return PH_COLORS[lo];
  // 소수면 가까운 쪽 (반올림에 가깝게)
  return v - lo < 0.5 ? PH_COLORS[lo] : PH_COLORS[hi];
}

export function phTextColor(value: number): string {
  const v = clampPh(value);
  // 노랑~연두 구간은 어두운 글자, 그 외는 흰색
  if (v >= 3.5 && v <= 6.2) return "#1a1a1a";
  return "#ffffff";
}

export function phBand(value: number): PhBand {
  const v = clampPh(value);
  if (v < 4) return "strong-acid";
  if (v < 6.5) return "weak-acid";
  if (v <= 7.5) return "neutral";
  if (v <= 10.5) return "weak-alkali";
  return "strong-alkali";
}

export function phNatureLabel(band: PhBand): string {
  switch (band) {
    case "strong-acid":
      return "강산성";
    case "weak-acid":
      return "약산성";
    case "neutral":
      return "중성";
    case "weak-alkali":
      return "약알칼리";
    case "strong-alkali":
      return "강알칼리";
  }
}

function formatValueLabel(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * phApprox 문자열에서 원액 pH 우선 추출.
 * 해당 없음·비수계는 null.
 */
export function parseProductPh(phApprox: string | null | undefined): PhInfo | null {
  if (!phApprox?.trim()) return null;
  const raw = phApprox.trim();
  if (/해당\s*없음|적용되지\s*않|비수계|용제\s*기반/.test(raw)) return null;

  // 원액 … 숫자 우선
  const concentrate =
    raw.match(
      /원액[^0-9]{0,24}?(?:약\s*)?(?:pH\s*)?(\d+(?:\.\d+)?)/i
    ) ?? raw.match(/(?:약\s*)?pH\s*(\d+(?:\.\d+)?)/i);

  let num: number | null = concentrate ? Number(concentrate[1]) : null;

  if (num === null || Number.isNaN(num)) {
    // 첫 번째 단독 숫자 (0–14 범위)
    const all = [...raw.matchAll(/(?:^|[^\d.])(\d+(?:\.\d+)?)(?=[^\d]|$)/g)];
    for (const m of all) {
      const n = Number(m[1]);
      if (n >= 0 && n <= 14) {
        num = n;
        break;
      }
    }
  }

  if (num === null || Number.isNaN(num) || num < 0 || num > 14) {
    // 문서에 성질만 있는 경우
    if (/강산/.test(raw)) return buildFromBand(1, "strong-acid");
    if (/약산/.test(raw)) return buildFromBand(5, "weak-acid");
    if (/중성/.test(raw) && !/약알칼리|알칼리/.test(raw)) return buildFromBand(7, "neutral");
    if (/강알칼/.test(raw)) return buildFromBand(13, "strong-alkali");
    if (/약알칼|알칼리/.test(raw)) return buildFromBand(9, "weak-alkali");
    return null;
  }

  const value = clampPh(num);
  const band = phBand(value);
  return {
    value,
    valueLabel: formatValueLabel(value),
    band,
    natureLabel: phNatureLabel(band),
    color: phColor(value),
    textColor: phTextColor(value),
  };
}

function buildFromBand(approxValue: number, band: PhBand): PhInfo {
  return {
    value: approxValue,
    valueLabel: formatValueLabel(approxValue),
    band,
    natureLabel: phNatureLabel(band),
    color: phColor(approxValue),
    textColor: phTextColor(approxValue),
  };
}
