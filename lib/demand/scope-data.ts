import { DEMAND_SNAPSHOT_META, getDemandDistrictBySlug } from "@/lib/demand/dummy-data";
import { DEMAND_DAILY_NATIONAL_KEYWORDS, DEMAND_TODAY_META } from "@/lib/demand/dummy-daily";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";
import type { DemandMetricId } from "@/lib/demand/metrics";
import {
  formatDemandRegionLabel,
  type DemandRegionScope,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import { demandKeywordKeyForMetric } from "@/lib/demand/keyword-hub-data";
import type { DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import {
  demandKeywordIndexLevelHint,
  demandKeywordVolumeLevelHint,
  resolveDemandKeywordBundle,
  type DemandKeywordIndexLevel,
} from "@/lib/demand/keyword-resolve";
import {
  buildRegionSearchPhrases,
  formatRegionSearchPhraseDisplay,
} from "@/lib/demand/region-search-keywords";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import { DEMAND_TABLE_ROWS } from "@/lib/demand/table-data";

export type DemandScopeTableRow = {
  selection: DemandRegionSelection;
  scope: DemandRegionScope;
  label: string;
  pathLabel: string;
  slug: string | null;
  hasDetail: boolean;
  indexScore: number | null;
  saleCount: number;
  saleMom: number;
  jeonseCount: number;
  jeonseMom: number;
  packing: DemandKeywordMetricSlice & { keyword: string; indexRatio?: number };
  moveInClean: DemandKeywordMetricSlice & { keyword: string; indexRatio?: number };
  keywordDailySeries?: Record<DemandKeywordKey, DemandChartPoint[]>;
  keywordMonthlyIndexSeries?: Record<DemandKeywordKey, DemandChartPoint[]>;
  keywordVolumeMonthlySeries?: Record<DemandKeywordKey, DemandChartPoint[]>;
  keywordSource?: { datalab: "live" | "dummy"; volume: "live" | "dummy" };
  keywordIndexLevel?: DemandKeywordIndexLevel;
  keywordVolumeLevel?: DemandKeywordIndexLevel;
  keywordIndexLevelByKey?: Record<DemandKeywordKey, DemandKeywordIndexLevel>;
  keywordVolumeLevelByKey?: Record<DemandKeywordKey, DemandKeywordIndexLevel>;
};

export type DemandRtmsDistrictOverrides = Record<
  string,
  {
    saleCount: number;
    jeonseCount: number;
    saleMom: number;
    jeonseMom: number;
  }
>;

export type DemandChartPoint = {
  period: string;
  value: number;
};

export type DemandChartRange = "30d" | "1y" | "3y";
export type DemandTradeChartRange = "12m" | "24m" | "36m";
export type DemandAnyChartRange = DemandChartRange | DemandTradeChartRange;

const CHART_DAILY_POINTS = 30;
/** 1년 차트: 월별 포인트가 이보다 적으면 일별 시계열로 대체 */
const MIN_MONTHLY_POINTS_FOR_YEAR_CHART = 3;
const MIN_VOLUME_MONTHLY_FOR_YEAR_CHART = 2;

function hashSeed(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pseudoMom(seed: string, spread = 16): number {
  return (hashSeed(seed) % (spread * 2 + 1)) - spread;
}

function searchVolumeForKeyword(keyword: string, nationalBase: number): number | null {
  const h = hashSeed(keyword);
  if (h % 47 === 0) return null;
  if (nationalBase > 50_000) {
    const scale = 0.25 + (h % 80) / 200;
    return Math.round(nationalBase * scale);
  }
  const base = keyword.includes("포장") ? 900 : 650;
  const spread = keyword.includes("포장") ? 4_800 : 3_200;
  return base + (h % spread);
}

function searchSliceForKeyword(
  keyword: string,
  nationalBase: number
): DemandKeywordMetricSlice & { keyword: string; indexRatio: number } {
  const belowTen = hashSeed(`${keyword}:lt10`) % 31 === 0;
  const vol = belowTen ? null : searchVolumeForKeyword(keyword, nationalBase);
  const packingPulse = DEMAND_DAILY_NATIONAL_KEYWORDS.find((k) => k.id === "packing");
  const moveInPulse = DEMAND_DAILY_NATIONAL_KEYWORDS.find((k) => k.id === "move-in-clean");
  const isPacking = keyword.includes("포장");
  const baseMom = isPacking
    ? DEMAND_SNAPSHOT_META.nationalKeywords.packingMom
    : DEMAND_SNAPSHOT_META.nationalKeywords.moveInCleanMom;
  const baseDod = isPacking ? packingPulse?.dayOverDayPercent ?? 0 : moveInPulse?.dayOverDayPercent ?? 0;
  const rawDod = baseDod + pseudoMom(`${keyword}:dod`, 4) * 0.15;
  const indexDodPercent = Math.round(Math.max(-2.9, Math.min(2.9, rawDod)) * 10) / 10;

  return {
    keyword,
    searchVolumeMonth: vol,
    searchVolumeBelowTen: belowTen,
    indexMomPercent: baseMom + pseudoMom(keyword, 8),
    indexDodPercent,
    /** 데이터랩 상대 지수 (0~100, 차트용) */
    indexRatio: 52 + (hashSeed(`${keyword}:ratio`) % 38),
  };
}

function seoulAggregateTrade(): { saleCount: number; jeonseCount: number; saleMom: number; jeonseMom: number } {
  const saleCount = DEMAND_TABLE_ROWS.reduce((s, r) => s + r.saleCount, 0);
  const jeonseCount = DEMAND_TABLE_ROWS.reduce((s, r) => s + r.jeonseCount, 0);
  const saleMom = Math.round(DEMAND_TABLE_ROWS.reduce((s, r) => s + r.saleMom, 0) / DEMAND_TABLE_ROWS.length);
  const jeonseMom = Math.round(DEMAND_TABLE_ROWS.reduce((s, r) => s + r.jeonseMom, 0) / DEMAND_TABLE_ROWS.length);
  return { saleCount, jeonseCount, saleMom, jeonseMom };
}

function seoulCompositeIndex(): number {
  const scored = DEMAND_TABLE_ROWS.filter((r) => r.indexScore != null);
  if (scored.length === 0) return 100;
  const sum = scored.reduce((s, r) => s + (r.indexScore ?? 0), 0);
  return Math.round(sum / scored.length);
}

function volumeBaseForScope(scope: DemandRegionScope): { packing: number; moveIn: number } {
  if (scope === "national") return { packing: 124_000, moveIn: 87_000 };
  if (scope === "city") return { packing: 42_000, moveIn: 28_000 };
  return { packing: 8_000, moveIn: 5_500 };
}

function keywordFieldsForSelection(
  selection: DemandRegionSelection,
  keywordStore: DemandKeywordStore | null | undefined
) {
  const phrases =
    buildRegionSearchPhrases(selection) ?? buildRegionSearchPhrases({ scope: "national" })!;
  const volBase = volumeBaseForScope(selection.scope);
  const displayPacking = formatRegionSearchPhraseDisplay(phrases.packing);
  const displayMoveIn = formatRegionSearchPhraseDisplay(phrases.moveInClean);
  const fallbackSlices = {
    packing: searchSliceForKeyword(displayPacking, volBase.packing),
    moveInClean: searchSliceForKeyword(displayMoveIn, volBase.moveIn),
  };

  if (!keywordStore) {
    return {
      packing: fallbackSlices.packing,
      moveInClean: fallbackSlices.moveInClean,
      keywordDailySeries: undefined,
      keywordMonthlyIndexSeries: undefined,
      keywordSource: { datalab: "dummy" as const, volume: "dummy" as const },
    };
  }

  const bundle = resolveDemandKeywordBundle(keywordStore, selection, fallbackSlices);

  return {
    packing: { ...bundle.packing, keyword: displayPacking },
    moveInClean: { ...bundle.moveInClean, keyword: displayMoveIn },
    keywordDailySeries: bundle.dailySeries,
    keywordMonthlyIndexSeries: bundle.monthlyIndexSeries,
    keywordVolumeMonthlySeries: bundle.volumeMonthlySeries,
    keywordSource: bundle.source,
    keywordIndexLevel: bundle.indexLevel,
    keywordVolumeLevel: bundle.volumeLevel,
    keywordIndexLevelByKey: bundle.indexLevelByKey,
    keywordVolumeLevelByKey: bundle.volumeLevelByKey,
  };
}

export function buildDemandScopeRow(
  selection: DemandRegionSelection,
  rtmsOverrides?: DemandRtmsDistrictOverrides,
  keywordStore?: DemandKeywordStore | null
): DemandScopeTableRow | null {
  const pathLabel = formatDemandRegionLabel(selection);
  if (!pathLabel) return null;

  const kw = keywordFieldsForSelection(selection, keywordStore);

  if (selection.scope === "national") {
    const agg = seoulAggregateTrade();
    return {
      selection,
      scope: "national",
      label: "전국",
      pathLabel,
      slug: null,
      hasDetail: false,
      indexScore: 108,
      saleCount: Math.round(agg.saleCount * 4.2),
      saleMom: 9,
      jeonseCount: Math.round(agg.jeonseCount * 4.1),
      jeonseMom: 11,
      ...kw,
    };
  }

  if (selection.scope === "city") {
    const agg = seoulAggregateTrade();
    return {
      selection,
      scope: "city",
      label: "서울특별시",
      pathLabel,
      slug: null,
      hasDetail: false,
      indexScore: seoulCompositeIndex(),
      saleCount: agg.saleCount,
      saleMom: agg.saleMom,
      jeonseCount: agg.jeonseCount,
      jeonseMom: agg.jeonseMom,
      ...kw,
    };
  }

  const tableRow = DEMAND_TABLE_ROWS.find((r) => r.slug === selection.guSlug);
  if (!tableRow) return null;
  const rtms = rtmsOverrides?.[tableRow.slug];
  return {
    selection,
    scope: "district",
    label: tableRow.gu,
    pathLabel,
    slug: tableRow.slug,
    hasDetail: tableRow.hasDetail,
    indexScore: tableRow.indexScore,
    saleCount: rtms?.saleCount ?? tableRow.saleCount,
    saleMom: rtms?.saleMom ?? tableRow.saleMom,
    jeonseCount: rtms?.jeonseCount ?? tableRow.jeonseCount,
    jeonseMom: rtms?.jeonseMom ?? tableRow.jeonseMom,
    ...kw,
  };
}

export function buildDemandScopeRows(selections: DemandRegionSelection[]): DemandScopeTableRow[] {
  return selections
    .map((s) => buildDemandScopeRow(s))
    .filter((r): r is DemandScopeTableRow => r != null);
}

export function buildDemandScopeRowsWithRtms(
  selections: DemandRegionSelection[],
  rtmsOverrides: DemandRtmsDistrictOverrides,
  keywordStore?: DemandKeywordStore | null
): DemandScopeTableRow[] {
  return selections
    .map((s) => buildDemandScopeRow(s, rtmsOverrides, keywordStore))
    .filter((r): r is DemandScopeTableRow => r != null);
}

/** 차트 X축 — YY.M (더미 기준 2024.11~) */
const MONTH_YYM = [
  "24.11",
  "24.12",
  "25.1",
  "25.2",
  "25.3",
  "25.4",
  "25.5",
  "25.6",
  "25.7",
  "25.8",
  "25.9",
  "25.10",
];

function chartMonthPeriods(range: DemandChartRange): string[] {
  if (range === "3y") return MONTH_YYM;
  return MONTH_YYM.slice(-12);
}

export function demandRtmsSeriesKeyForRow(row: DemandScopeTableRow): string {
  if (row.scope === "national") return "national:kr";
  if (row.scope === "city") return "city:seoul";
  if (row.slug) return `district:${row.slug}`;
  return "district:unknown";
}

function yyyymmToChartPeriod(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  if (!y || !m) return yyyymm;
  return `${y.slice(2)}.${Number(m)}`;
}

function buildRtmsTradeChartSeries(
  row: DemandScopeTableRow,
  metricId: "sale" | "jeonse",
  range: DemandTradeChartRange,
  store: DemandRtmsSeriesStore
): {
  points: DemandChartPoint[];
  chartKind: "trade";
  subtitle: string;
} | null {
  const key = demandRtmsSeriesKeyForRow(row);
  const all = store[key];
  if (!all?.length) return null;

  const months = range === "36m" ? 36 : range === "24m" ? 24 : 12;
  const slice = all.slice(-months);
  const isSale = metricId === "sale";
  const tradeLabel = isSale ? "매매" : "전월세";

  return {
    chartKind: "trade",
    subtitle: `${row.pathLabel} · RTMS 아파트 ${tradeLabel} · 최근 ${slice.length}개월`,
    points: slice.map((p) => ({
      period: yyyymmToChartPeriod(p.yyyymm),
      value: isSale ? p.saleCount : p.jeonseCount,
    })),
  };
}

function buildDummyTradeChartSeries(
  row: DemandScopeTableRow,
  metricId: "sale" | "jeonse",
  range: DemandTradeChartRange
): {
  points: DemandChartPoint[];
  chartKind: "trade";
  subtitle: string;
} {
  const seed = `${demandScopeChartSeed(row)}:${metricId}`;
  const h = hashSeed(seed);
  const isSale = metricId === "sale";
  const count = isSale ? row.saleCount : row.jeonseCount;
  const mom = isSale ? row.saleMom : row.jeonseMom;
  const tradeLabel = isSale ? "매매" : "전월세";
  const n = range === "36m" ? 36 : range === "24m" ? 24 : 12;
  const last = n - 1;

  return {
    chartKind: "trade",
    subtitle: `${row.pathLabel} · RTMS 아파트 ${tradeLabel} · 최근 ${n}개월 (더미)`,
    points: Array.from({ length: n }, (_, i) => {
      const drift = 1 + (mom / 100) * (last <= 0 ? 0 : i / last);
      const wobble = 0.88 + ((h + i * 23) % 24) / 100;
      const yy = 24 + Math.floor((11 + i) / 12);
      const mm = ((11 + i) % 12) + 1;
      return {
        period: `${yy}.${mm}`,
        value: Math.max(10, Math.round((count / 1.1) * drift * wobble)),
      };
    }),
  };
}

/** KST 말일 기준 최근 N일 — 라벨 YY.M.D */
function lastNDayPeriodLabels(endYmd: string, n: number): string[] {
  const [y, m, d] = endYmd.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const labels: string[] = [];
  for (let offset = n - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setDate(date.getDate() - offset);
    const yy = String(date.getFullYear()).slice(2);
    labels.push(`${yy}.${date.getMonth() + 1}.${date.getDate()}`);
  }
  return labels;
}

function buildDailyIndexDeltaPoints(
  seed: string,
  anchorPercent: number,
  periods: string[]
): DemandChartPoint[] {
  const h = hashSeed(seed);
  const last = periods.length - 1;
  return periods.map((period, i) => {
    const drift = anchorPercent + (i - last) * 0.04;
    const wobble = ((h + i * 7) % 11) * 0.1 - 0.5;
    const v = Math.round(Math.max(-2.9, Math.min(2.9, drift + wobble)) * 10) / 10;
    return { period, value: v };
  });
}

/**
 * 검색광고 API에 월별 절대량이 없을 때, 동일 지역·키워드 데이터랩 월 지수로 형태만 추정.
 * 네이버 키워드도구 「월별 검색수」 달력 차트와 수치·기준이 다릅니다.
 */
function estimateVolumeFromDatalabMonthlyIndex(
  current30dTotal: number,
  monthlyIndex: DemandChartPoint[]
): DemandChartPoint[] {
  if (monthlyIndex.length < MIN_MONTHLY_POINTS_FOR_YEAR_CHART || current30dTotal <= 0) {
    return [];
  }
  const weights = monthlyIndex.map((p) => Math.max(p.value, 0.01));
  const mean = weights.reduce((s, w) => s + w, 0) / weights.length;
  return monthlyIndex.map((p) => ({
    period: p.period,
    value: Math.max(0, Math.round((current30dTotal * p.value) / mean)),
  }));
}

/** 검색광고는 일별 미제공 — 데이터랩 지수 비율로 30일 총량 배분(동일 지역·키워드) */
function distributeSearchVolume30d(
  total30d: number,
  dailyIndex: DemandChartPoint[] | undefined,
  dayPeriods: string[]
): DemandChartPoint[] {
  const indexPoints = dailyIndex?.slice(-dayPeriods.length) ?? [];
  if (indexPoints.length >= 7 && indexPoints.length === dayPeriods.length) {
    const sum = indexPoints.reduce((s, p) => s + Math.max(p.value, 0.01), 0);
    return indexPoints.map((p) => ({
      period: p.period,
      value: Math.max(0, Math.round((total30d * Math.max(p.value, 0.01)) / sum)),
    }));
  }
  const mean = total30d / Math.max(dayPeriods.length, 1);
  return dayPeriods.map((period) => ({
    period,
    value: Math.round(mean),
  }));
}

function buildDailyCompositePoints(
  seed: string,
  base: number,
  periods: string[]
): DemandChartPoint[] {
  const h = hashSeed(seed);
  const last = periods.length - 1;
  return periods.map((period, i) => ({
    period,
    value: Math.max(
      70,
      Math.round(base - 8 + (last <= 0 ? 0 : (i / last) * 10) + ((h + i * 3) % 5))
    ),
  }));
}

export function buildDemandMetricChartSeries(
  row: DemandScopeTableRow,
  metricId: DemandMetricId,
  range: DemandAnyChartRange = "30d",
  options?: {
    rtmsSeries?: DemandRtmsSeriesStore;
  }
): {
  points: DemandChartPoint[];
  chartKind: "trade" | "index" | "indexDelta" | "volume" | "composite";
  subtitle: string;
} {
  if (metricId === "sale" || metricId === "jeonse") {
    const tradeRange: DemandTradeChartRange =
      range === "36m" ? "36m" : range === "24m" ? "24m" : "12m";
    const fromDb =
      options?.rtmsSeries &&
      buildRtmsTradeChartSeries(row, metricId, tradeRange, options.rtmsSeries);
    if (fromDb) return fromDb;
    return buildDummyTradeChartSeries(row, metricId, tradeRange);
  }

  const searchRange: DemandChartRange =
    range === "1y" || range === "3y" ? range : "30d";
  const seed = `${demandScopeChartSeed(row)}:${metricId}`;
  const h = hashSeed(seed);
  const isDaily = searchRange === "30d";
  const dayPeriods = lastNDayPeriodLabels(DEMAND_TODAY_META.briefingDateYmd, CHART_DAILY_POINTS);
  const monthPeriods = chartMonthPeriods(searchRange);

  if (metricId === "packingVolume" || metricId === "moveInVolume") {
    const slice = metricId === "packingVolume" ? row.packing : row.moveInClean;
    const key = demandKeywordKeyForMetric(metricId);
    const monthlyVol = row.keywordVolumeMonthlySeries?.[key];
    const dailyIndex = row.keywordDailySeries?.[key];
    const vol = slice.searchVolumeMonth ?? 0;
    const volumeLive = row.keywordSource?.volume === "live";
    const volumeLevel =
      row.keywordVolumeLevelByKey?.[key] ?? row.keywordVolumeLevel ?? "dummy";
    const volumeHint = demandKeywordVolumeLevelHint(row.selection, volumeLevel);

    if (!isDaily && volumeLive && monthlyVol && monthlyVol.length >= MIN_VOLUME_MONTHLY_FOR_YEAR_CHART) {
      const points = monthlyVol.slice(-12);
      return {
        chartKind: "volume",
        subtitle: `키워드 「${slice.keyword}」 · 검색광고 월 스냅샷(수집 시점·최근 30일 롤링) · ${points.length}개월${volumeHint} · 콘솔 달력 12개월 차트와 다를 수 있음`,
        points,
      };
    }

    if (!isDaily && volumeLive && monthlyVol?.length === 1) {
      return {
        chartKind: "volume",
        subtitle: `키워드 「${slice.keyword}」 · 검색광고 스냅샷 1개월(${monthlyVol[0].period})${volumeHint} · 1년 그래프는 매월 수집 후 채워짐 · API는 콘솔 「월별 검색수」12개월 미제공`,
        points: monthlyVol,
      };
    }

    if (!isDaily && volumeLive && vol > 0) {
      const monthlyIndex = row.keywordMonthlyIndexSeries?.[key];
      const estimated = estimateVolumeFromDatalabMonthlyIndex(vol, monthlyIndex ?? []);
      if (estimated.length >= MIN_VOLUME_MONTHLY_FOR_YEAR_CHART) {
        return {
          chartKind: "volume",
          subtitle: `키워드 「${slice.keyword}」 · 데이터랩 월별 추이×현재 검색광고 30일 총량 추정${volumeHint} · 검색광고 콘솔 월별 검색수와 다름`,
          points: estimated.slice(-12),
        };
      }
    }

    if (isDaily && volumeLive && vol > 0) {
      const points = distributeSearchVolume30d(vol, dailyIndex, dayPeriods);
      const shaped = (dailyIndex?.length ?? 0) >= 7;
      return {
        chartKind: "volume",
        subtitle: shaped
          ? `키워드 「${slice.keyword}」 · 검색광고 최근 30일 추정 · 데이터랩 추이로 일별 배분${volumeHint}`
          : `키워드 「${slice.keyword}」 · 검색광고 최근 30일 추정(일별 API 없음·균등)${volumeHint}`,
        points,
      };
    }

    if (isDaily) {
      const mean = vol / Math.max(dayPeriods.length, 1);
      return {
        chartKind: "volume",
        subtitle: `키워드 「${slice.keyword}」 · 최근 ${CHART_DAILY_POINTS}일 (더미)`,
        points: dayPeriods.map((period) => ({ period, value: Math.round(mean) })),
      };
    }

    return {
      chartKind: "volume",
      subtitle: volumeLive
        ? `키워드 「${slice.keyword}」 · 1년 차트 없음 — 검색광고 API는 「최근 30일」 1값만 제공(콘솔 월별 12개월과 별도)${volumeHint} · 매월 「검색광고 수집」으로 스냅샷 누적 또는 데이터랩(지역) 수집 후 표시`
        : `키워드 「${slice.keyword}」 · 검색량 데이터 없음`,
      points: [],
    };
  }

  if (metricId === "packingIndex" || metricId === "moveInIndex") {
    const slice = metricId === "packingIndex" ? row.packing : row.moveInClean;
    const key = demandKeywordKeyForMetric(metricId);
    const rowSeries = row.keywordDailySeries?.[key];
    const monthlySeries = row.keywordMonthlyIndexSeries?.[key];
    const liveDaily =
      isDaily && row.keywordSource?.datalab === "live" && (rowSeries?.length ?? 0) > 0;
    const levelHint = demandKeywordIndexLevelHint(
      row.selection,
      row.keywordIndexLevelByKey?.[key] ?? row.keywordIndexLevel ?? "dummy"
    );

    if (liveDaily && rowSeries && isDaily) {
      const points = rowSeries.slice(-CHART_DAILY_POINTS);
      return {
        chartKind: "index",
        subtitle: `키워드 「${slice.keyword}」 · 데이터랩 상대지수(0~100) · 최근 ${points.length}일${levelHint}`,
        points,
      };
    }

    if (
      searchRange === "1y" &&
      liveDaily &&
      rowSeries &&
      rowSeries.length > 0 &&
      (!monthlySeries || monthlySeries.length < MIN_MONTHLY_POINTS_FOR_YEAR_CHART)
    ) {
      const points = rowSeries.slice(-365);
      return {
        chartKind: "index",
        subtitle: `키워드 「${slice.keyword}」 · 데이터랩 일별 상대지수(0~100) · ${points.length}일 (월별 ${monthlySeries?.length ?? 0}개월 — 12개월 미만)${levelHint}`,
        points,
      };
    }

    if (
      row.keywordSource?.datalab === "live" &&
      monthlySeries &&
      monthlySeries.length >= MIN_MONTHLY_POINTS_FOR_YEAR_CHART
    ) {
      const points = monthlySeries.slice(-12);
      return {
        chartKind: "index",
        subtitle: `키워드 「${slice.keyword}」 · 데이터랩 월별 상대지수(0~100) · ${points.length}개월${levelHint}`,
        points,
      };
    }

    const periods = isDaily ? dayPeriods : monthPeriods;
    return {
      chartKind: "indexDelta",
      subtitle: isDaily
        ? `키워드 「${slice.keyword}」 · 최근 ${CHART_DAILY_POINTS}일 전일 대비 % (더미)`
        : `키워드 「${slice.keyword}」 · 월별 지수 변화 (더미)`,
      points: isDaily
        ? buildDailyIndexDeltaPoints(seed, slice.indexDodPercent, periods)
        : periods.map((period, i) => {
            const drift = slice.indexDodPercent + (i - periods.length + 1) * 0.15;
            const wobble = ((h + i * 7) % 11) * 0.15 - 0.75;
            const v = Math.round(Math.max(-2.9, Math.min(2.9, drift + wobble)) * 10) / 10;
            return { period, value: v };
          }),
    };
  }

  if (metricId === "composite") {
    const base = row.indexScore ?? 100;
    if (isDaily) {
      return {
        chartKind: "composite",
        subtitle: `입주 온도 · 최근 ${CHART_DAILY_POINTS}일 (더미)`,
        points: buildDailyCompositePoints(seed, base, dayPeriods),
      };
    }
    return {
      chartKind: "composite",
      subtitle: "입주 온도 · 월별 (더미)",
      points: monthPeriods.map((period, i) => ({
        period,
        value: Math.max(70, base - 12 + i * 2 + ((h + i) % 6)),
      })),
    };
  }

  throw new Error(`Unsupported metric: ${metricId satisfies never}`);
}

function demandScopeChartSeed(row: DemandScopeTableRow): string {
  if (row.scope === "national") return "national";
  if (row.scope === "city") return "city:seoul";
  return row.slug ?? row.label;
}
