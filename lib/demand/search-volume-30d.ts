import { addDaysToDateString, getKstYesterdayString } from "@/lib/jobs/kst-date";
import type { DemandKeywordChartPoint } from "@/lib/demand/keyword-hub-data";
import { formatChartMonthPeriodLabel, formatDemandYyyymmLabel, ymdToChartDayPeriodLabel } from "@/lib/demand/copy";
import { demandLastCompleteSearchVolumeYyyymm } from "@/lib/demand/searchad-month-report";

export type DemandChartPoint = DemandKeywordChartPoint;

export type DemandChartDay = { period: string; ymd: string };

/** KST 말일 기준 최근 N일 — 차트 라벨 「YYYY년 M월 D일」 + YYYY-MM-DD */
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
    days.push({
      period: ymdToChartDayPeriodLabel(ymd),
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

function periodLabelToYmd(period: string): string | null {
  const kr = period.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/);
  if (!kr) return null;
  return `${kr[1]}-${String(Number(kr[2])).padStart(2, "0")}-${String(Number(kr[3])).padStart(2, "0")}`;
}

function indexSeriesToYmdMap(series: DemandChartPoint[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of series) {
    const ymd = periodLabelToYmd(p.period);
    if (ymd && Number.isFinite(p.value)) out[ymd] = p.value;
  }
  return out;
}

/** 지수 미수집 일은 직전 값으로 채워 검색량 수집일까지 30일 창 유지 */
function forwardFillIndexWeights(
  chartDays: DemandChartDay[],
  byYmd: Record<string, number>
): { weights: number[]; lastIndexYmd: string | null } {
  const weights: number[] = [];
  let lastPositive = 0.01;
  let lastIndexYmd: string | null = null;
  for (const d of chartDays) {
    const v = byYmd[d.ymd] ?? 0;
    if (v > 0) {
      lastPositive = v;
      lastIndexYmd = d.ymd;
    }
    weights.push(v > 0 ? v : lastPositive);
  }
  return { weights, lastIndexYmd };
}

function mergeIndexMaps(...maps: Record<string, number>[]): Record<string, number> {
  return Object.assign({}, ...maps);
}

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
}): {
  points: DemandChartPoint[];
  shaped: boolean;
  endYmd: string;
  lastIndexYmd: string | null;
} {
  const endYmd = params.endYmd ?? defaultSearchVolumeChartEndYmd();
  const n = params.days ?? 30;
  const chartDays = lastKstChartDays(endYmd, n);
  const indexByYmd = mergeIndexMaps(
    params.dailyIndexByYmd ?? {},
    params.indexSeries?.length ? indexSeriesToYmdMap(params.indexSeries) : {}
  );
  const { weights, lastIndexYmd } = forwardFillIndexWeights(chartDays, indexByYmd);
  const positiveDays = Object.keys(indexByYmd).filter((ymd) => (indexByYmd[ymd] ?? 0) > 0).length;

  if (positiveDays >= MIN_INDEX_DAYS_FOR_VOLUME_SHAPE) {
    const points = distributeVolumeByWeights(
      params.totalVolume,
      chartDays.map((d) => d.period),
      weights
    );
    return { points, shaped: hasVolumeShape(points), endYmd, lastIndexYmd };
  }

  const mean = params.totalVolume / Math.max(chartDays.length, 1);
  return {
    points: chartDays.map((d) => ({ period: d.period, value: Math.round(mean) })),
    shaped: false,
    endYmd,
    lastIndexYmd,
  };
}

/** @deprecated formatSearchVolumeCardSub(copy.ts) 사용 */
export function formatMonthlyVolumeCardSub(monthLabel: string | null): string {
  if (monthLabel) {
    return formatChartMonthPeriodLabel(monthLabel);
  }
  return formatDemandYyyymmLabel(demandLastCompleteSearchVolumeYyyymm());
}
