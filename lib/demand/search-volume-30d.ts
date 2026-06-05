import { addDaysToDateString, getKstYesterdayString } from "@/lib/jobs/kst-date";
import type { DemandKeywordChartPoint } from "@/lib/demand/keyword-hub-data";
import { formatChartMonthPeriodLabel, formatDemandYyyymmLabel } from "@/lib/demand/copy";
import { demandLastCompleteSearchVolumeYyyymm } from "@/lib/demand/searchad-month-report";

export type DemandChartPoint = DemandKeywordChartPoint;

export type DemandChartDay = { period: string; ymd: string };

/** KST 말일 기준 최근 N일 — 차트 라벨 YY.M.D + YYYY-MM-DD */
export function lastKstChartDays(endYmd: string, n: number): DemandChartDay[] {
  const [y, m, d] = endYmd.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const days: DemandChartDay[] = [];
  for (let offset = n - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setDate(date.getDate() - offset);
    const ymd = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const yy = String(date.getFullYear()).slice(2);
    days.push({
      period: `${yy}.${date.getMonth() + 1}.${date.getDate()}`,
      ymd,
    });
  }
  return days;
}

export function defaultSearchVolumeChartEndYmd(): string {
  return getKstYesterdayString();
}

/** 최근 N일(KST) 구간 안에 일별 지수가 있는 날 수 */
export function countDailyIndexInChartWindow(
  dailyIndexByYmd: Record<string, number>,
  endYmd: string,
  days = 30
): number {
  const ymdSet = new Set(lastKstChartDays(endYmd, days).map((d) => d.ymd));
  return Object.keys(dailyIndexByYmd).filter(
    (ymd) => ymdSet.has(ymd) && (dailyIndexByYmd[ymd] ?? 0) > 0
  ).length;
}

/** 콘솔 월별 검색량 중 마지막 확정 달 (30일 차트 총량 앵커) */
export function anchorVolumeFromMonthlySeries(
  monthly: DemandChartPoint[] | undefined
): { total: number; monthLabel: string | null } | null {
  if (!monthly?.length) return null;
  const last = monthly[monthly.length - 1];
  if (!last?.value || last.value <= 0) return null;
  return { total: last.value, monthLabel: last.period };
}

const MIN_INDEX_DAYS_FOR_VOLUME_SHAPE = 7;

function distributeVolumeByWeights(
  totalVolume: number,
  periods: string[],
  weights: number[]
): DemandChartPoint[] {
  const effective = weights.map((w) => (w > 0 ? w : 0.01));
  const sum = effective.reduce((s, w) => s + w, 0);
  let allocated = 0;
  return periods.map((period, i) => {
    const isLast = i === periods.length - 1;
    const value = isLast
      ? Math.max(0, totalVolume - allocated)
      : Math.max(0, Math.round((totalVolume * effective[i]) / sum));
    allocated += value;
    return { period, value };
  });
}

function hasVolumeShape(points: DemandChartPoint[]): boolean {
  return new Set(points.map((p) => p.value)).size > 1;
}

/**
 * 30일 검색량 전용 — 콘솔 월 합계(total)를 데이터랩 일별 지수 비율로 30일에만 배분.
 * 1년 검색량·검색지수 차트에는 사용하지 않음. 합계 ≈ total.
 */
export function buildSearchVolume30dChart(params: {
  totalVolume: number;
  /** 검색지수 30일 차트와 동일한 일별 시리즈(우선) */
  indexSeries?: DemandChartPoint[];
  dailyIndexByYmd?: Record<string, number>;
  endYmd?: string;
  days?: number;
}): { points: DemandChartPoint[]; shaped: boolean; endYmd: string } {
  const endYmd = params.endYmd ?? defaultSearchVolumeChartEndYmd();
  const n = params.days ?? 30;

  if (params.indexSeries && params.indexSeries.length >= MIN_INDEX_DAYS_FOR_VOLUME_SHAPE) {
    const series = params.indexSeries.slice(-n);
    const weights = series.map((p) => p.value);
    if (weights.filter((w) => w > 0).length >= MIN_INDEX_DAYS_FOR_VOLUME_SHAPE) {
      const points = distributeVolumeByWeights(
        params.totalVolume,
        series.map((p) => p.period),
        weights
      );
      return { points, shaped: hasVolumeShape(points), endYmd };
    }
  }

  const chartDays = lastKstChartDays(endYmd, n);
  const byYmd = params.dailyIndexByYmd ?? {};
  const weights = chartDays.map((d) => Math.max(byYmd[d.ymd] ?? 0, 0));
  const hasShape = weights.filter((w) => w > 0).length >= MIN_INDEX_DAYS_FOR_VOLUME_SHAPE;
  const weightSum = weights.reduce((s, w) => s + (w > 0 ? w : 0), 0);

  if (hasShape && weightSum > 0) {
    const points = distributeVolumeByWeights(
      params.totalVolume,
      chartDays.map((d) => d.period),
      weights
    );
    return { points, shaped: hasVolumeShape(points), endYmd };
  }

  const mean = params.totalVolume / Math.max(chartDays.length, 1);
  return {
    points: chartDays.map((d) => ({ period: d.period, value: Math.round(mean) })),
    shaped: false,
    endYmd,
  };
}

/** @deprecated formatSearchVolumeCardSub(copy.ts) 사용 */
export function formatMonthlyVolumeCardSub(monthLabel: string | null): string {
  if (monthLabel) {
    return formatChartMonthPeriodLabel(monthLabel);
  }
  return formatDemandYyyymmLabel(demandLastCompleteSearchVolumeYyyymm());
}
