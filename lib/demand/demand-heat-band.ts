import type { DemandHeatBand } from "@/lib/demand/district-demand-score";
import {
  DEMAND_HEAT_BAND_THRESHOLDS,
  REGIONAL_HEAT_BAND_HISTORY_WINDOW,
  REGIONAL_HEAT_BAND_MIN_HISTORY,
  REGIONAL_HEAT_BAND_PERCENTILES,
} from "@/lib/demand/demand-score-weights";
import { chartPeriodToYyyymm } from "@/lib/demand/demand-score-series";
import type { DemandChartPoint } from "@/lib/demand/scope-data";

export type DemandHeatBandMeta = {
  /** 0–100, null = 절대 임계값 폴백 */
  percentile: number | null;
  /** 벤치마크에 사용한 과거 개월 수 */
  historyMonths: number;
  /** true = 지역 그래프 상대, false = 절대 임계값 */
  relative: boolean;
};

function absoluteDemandHeatBand(score: number): DemandHeatBand {
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.veryHot) return "very_hot";
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.hot) return "hot";
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.rising) return "rising";
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.normal) return "normal";
  return "weak";
}

function bandFromPercentile(percentile: number): DemandHeatBand {
  const p = REGIONAL_HEAT_BAND_PERCENTILES;
  if (percentile >= p.veryHot) return "very_hot";
  if (percentile >= p.hot) return "hot";
  if (percentile >= p.rising) return "rising";
  if (percentile >= p.normal) return "normal";
  return "weak";
}

/** 현재 점수가 벤치마크 풀에서 차지하는 백분위 (0=최저, 100=최고) */
export function percentileRankAmongScores(current: number, benchmark: number[]): number {
  if (!Number.isFinite(current) || benchmark.length === 0) return 50;
  const less = benchmark.filter((v) => v < current).length;
  const equal = benchmark.filter((v) => v === current).length;
  return Math.round(((less + equal / 2) / benchmark.length) * 1000) / 10;
}

/** 차트 시리즈 — 대상월 제외, 최근 window개월 점수 */
export function benchmarkScoresFromChartSeries(
  series: DemandChartPoint[],
  targetYyyymm: string | null,
  windowMonths = REGIONAL_HEAT_BAND_HISTORY_WINDOW
): number[] {
  const sorted = [...series].sort((a, b) => {
    const ya = chartPeriodToYyyymm(a.period) ?? "";
    const yb = chartPeriodToYyyymm(b.period) ?? "";
    return ya.localeCompare(yb);
  });

  const values = sorted
    .filter((p) => {
      if (!Number.isFinite(p.value)) return false;
      if (!targetYyyymm) return true;
      const ym = chartPeriodToYyyymm(p.period);
      return ym !== targetYyyymm;
    })
    .map((p) => p.value);

  return values.slice(-windowMonths);
}

export function resolveDemandHeatBand(
  currentScore: number,
  benchmarkScores: number[]
): { band: DemandHeatBand; meta: DemandHeatBandMeta } {
  if (benchmarkScores.length < REGIONAL_HEAT_BAND_MIN_HISTORY) {
    return {
      band: absoluteDemandHeatBand(currentScore),
      meta: {
        percentile: null,
        historyMonths: benchmarkScores.length,
        relative: false,
      },
    };
  }

  const percentile = percentileRankAmongScores(currentScore, benchmarkScores);
  return {
    band: bandFromPercentile(percentile),
    meta: {
      percentile,
      historyMonths: benchmarkScores.length,
      relative: true,
    },
  };
}
