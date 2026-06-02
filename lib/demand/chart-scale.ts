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
