/** 선형 스케일 — 차트 Y축·미니바 공통 */

export function linearMap(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number
): number {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  const t = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

export function niceLinearDomain(values: number[], options?: { padRatio?: number; floorAtZero?: boolean }) {
  const padRatio = options?.padRatio ?? 0.08;
  const floorAtZero = options?.floorAtZero ?? false;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.1, 1);
    min -= pad;
    max += pad;
  } else {
    const span = max - min;
    min -= span * padRatio;
    max += span * padRatio;
  }
  if (floorAtZero && min < 0) min = 0;
  return { min, max };
}

/** 검색지수 전일 % 미니바 — -3% ~ +3% */
export const SEARCH_INDEX_BAR_MIN = -3;
export const SEARCH_INDEX_BAR_MAX = 3;

export function searchIndexBarPercent(value: number): number {
  const clamped = Math.max(SEARCH_INDEX_BAR_MIN, Math.min(SEARCH_INDEX_BAR_MAX, value));
  return linearMap(clamped, SEARCH_INDEX_BAR_MIN, SEARCH_INDEX_BAR_MAX, 0, 100);
}

export function buildLinearTicks(min: number, max: number, count = 4): number[] {
  if (count < 2 || min === max) return [min, max];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

function niceStep(span: number, targetCount: number): number {
  if (span <= 0) return 1;
  const rough = span / Math.max(targetCount - 1, 1);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  if (norm <= 1) return mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

/** 읽기 쉬운 Y축 눈금·도메인 (242, 244, 247 … 대신 240, 245, 250) */
export function niceChartScale(
  values: number[],
  options?: { floorAtZero?: boolean; symmetric?: boolean }
): { min: number; max: number; ticks: number[] } {
  const floorAtZero = options?.floorAtZero ?? false;
  const symmetric = options?.symmetric ?? false;

  if (values.length === 0) return { min: 0, max: 1, ticks: [0, 1] };

  let dataMin = Math.min(...values);
  let dataMax = Math.max(...values);

  if (symmetric) {
    const bound = Math.max(1, Math.ceil(Math.max(Math.abs(dataMin), Math.abs(dataMax)) * 10) / 10);
    const step = bound <= 1.5 ? 0.5 : 1;
    const min = -bound;
    const max = bound;
    const ticks: number[] = [];
    for (let v = min; v <= max + step * 0.001; v += step) {
      ticks.push(Math.round(v * 10) / 10);
    }
    return { min, max, ticks };
  }

  if (dataMin === dataMax) {
    const pad = Math.max(Math.abs(dataMin) * 0.12, dataMin >= 100 ? 10 : 1);
    dataMin -= pad;
    dataMax += pad;
  }

  const step = niceStep(dataMax - dataMin, 5);
  let min = Math.floor(dataMin / step) * step;
  let max = Math.ceil(dataMax / step) * step;

  if (max - min < step * 2) {
    min -= step;
    max += step;
  }
  if (floorAtZero && min < 0) min = 0;

  const ticks: number[] = [];
  for (let v = min; v <= max + step * 0.001; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }

  return { min, max, ticks };
}
