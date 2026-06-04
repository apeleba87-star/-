import type { DemandChartPoint } from "@/lib/demand/scope-data";
import {
  DEMAND_BASKET_PHRASES,
  type DemandBasketId,
} from "@/lib/demand/keyword-baskets";
import { momPercentFromChartPoints } from "@/lib/demand/composite-index";

export type BasketVolumeMonthRow = {
  yyyymm: string;
  volume: number | null;
  belowTen: boolean;
};

/** phrase별 월별 행 → Basket 월별 합산 (belowTen → 0) */
export function aggregateBasketVolumeMonthly(
  rows: BasketVolumeMonthRow[],
  phrases: readonly string[],
  phraseFilter?: (phrase: string) => boolean
): DemandChartPoint[] {
  const allowed = new Set(phrases);
  const byMonth = new Map<string, number>();

  for (const row of rows) {
    const phrase = (row as BasketVolumeMonthRow & { search_phrase?: string }).search_phrase;
    if (phrase && !allowed.has(phrase) && phraseFilter && !phraseFilter(phrase)) continue;
    if (phrase && !allowed.has(phrase)) continue;

    const vol =
      row.belowTen || row.volume == null || !Number.isFinite(row.volume) ? 0 : row.volume;
    byMonth.set(row.yyyymm, (byMonth.get(row.yyyymm) ?? 0) + vol);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yyyymm, value]) => ({
      period: `${yyyymm.slice(2, 4)}.${Number(yyyymm.slice(5, 7))}`,
      value,
    }));
}

export function sumBasketRowsByMonth(
  rows: Array<{ yyyymm: string; volume: number | null; belowTen: boolean }>
): DemandChartPoint[] {
  const byMonth = new Map<string, number>();
  for (const row of rows) {
    const vol =
      row.belowTen || row.volume == null || !Number.isFinite(row.volume) ? 0 : row.volume;
    byMonth.set(row.yyyymm, (byMonth.get(row.yyyymm) ?? 0) + vol);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yyyymm, value]) => ({
      period: `${yyyymm.slice(2, 4)}.${Number(yyyymm.slice(5, 7))}`,
      value,
    }));
}

export function basketMomPercent(points: DemandChartPoint[]): number | null {
  return momPercentFromChartPoints(points);
}

/** 최근 N개월 평균 대비 현재월이 낮은지 (입주 Basket 「아직 약함」) */
export function isBelowRecentAverage(
  points: DemandChartPoint[],
  lookbackMonths = 3,
  ratio = 0.95
): boolean {
  if (points.length < 2) return false;
  const curr = points[points.length - 1]?.value ?? 0;
  const prior = points
    .slice(-(lookbackMonths + 1), -1)
    .map((p) => p.value)
    .filter((v) => v > 0);
  if (prior.length === 0) return false;
  const avg = prior.reduce((s, v) => s + v, 0) / prior.length;
  return curr < avg * ratio;
}

export function basketPhrasesForId(basketId: DemandBasketId): readonly string[] {
  return DEMAND_BASKET_PHRASES[basketId];
}
