import {
  DEMAND_VOLUME_1Y_SOURCE_NOTE,
  DEMAND_VOLUME_30D_FLAT_NOTE,
  DEMAND_VOLUME_30D_INDEX_SHAPE_NOTE,
} from "@/lib/demand/copy";
import { DEMAND_DAILY_NATIONAL_KEYWORDS, DEMAND_TODAY_META } from "@/lib/demand/dummy-daily";
import { DEMAND_SNAPSHOT_META, getDemandDistrictBySlug } from "@/lib/demand/dummy-data";
import {
  anchorVolumeFromMonthlySeries,
  buildSearchVolume30dChart,
  defaultSearchVolumeChartEndYmd,
  lastKstChartDays,
} from "@/lib/demand/search-volume-30d";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";
import type { DemandMetricId } from "@/lib/demand/metrics";
import {
  demandDistrictRegionKey,
  formatDemandRegionLabel,
  getDemandCity,
  getDemandDistrictRef,
  type DemandRegionScope,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";
import {
  demandKeywordHasIndexData,
  demandKeywordKeyForMetric,
} from "@/lib/demand/keyword-hub-data";
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
import {
  computePackingInterestScore,
  buildPackingInterestDummyMonthlyPoints,
  buildPackingInterestMonthlyChartPoints,
} from "@/lib/demand/packing-interest";
import type { DistrictDemandScore } from "@/lib/demand/district-demand-score";
import {
  buildDemandScoreContext,
  demandScoreForCity,
  demandScoreForNational,
  districtDemandScoreForRegionKey,
  type DemandScoreContext,
} from "@/lib/demand/seoul-demand-ranking";
import {
  buildDistrictMoveInDemandScoreChartSeries,
  nationalInterestMonthlyPoints,
} from "@/lib/demand/demand-score-series";
import { formatDemandScoreBasis } from "@/lib/demand/district-demand-score";
import { demandDistrictSearchExcludedFromHub } from "@/lib/demand/district-search-archive";
import { DEMAND_TABLE_ROWS } from "@/lib/demand/table-data";

export type { DemandScoreContext } from "@/lib/demand/seoul-demand-ranking";

export type DemandScopeTableRow = {
  selection: DemandRegionSelection;
  scope: DemandRegionScope;
  label: string;
  pathLabel: string;
  slug: string | null;
  hasDetail: boolean;
  /** @deprecated demandScore.score 사용 */
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
  keywordDailyIndexByYmd?: Record<DemandKeywordKey, Record<string, number>>;
  keywordSource?: { datalab: "live" | "dummy"; volume: "live" | "dummy" };
  keywordIndexLevel?: DemandKeywordIndexLevel;
  keywordVolumeLevel?: DemandKeywordIndexLevel;
  keywordIndexLevelByKey?: Record<DemandKeywordKey, DemandKeywordIndexLevel>;
  keywordVolumeLevelByKey?: Record<DemandKeywordKey, DemandKeywordIndexLevel>;
  searchVolumeDisplaySource?: "rolling_30d" | "monthly_archive";
  searchVolumeRollingSnapshotDate?: string | null;
  demandScore: DistrictDemandScore;
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

function pseudoTradeCount(seed: string, kind: "jeonse" | "sale"): number {
  const h = hashSeed(`${seed}:${kind}`);
  const base = kind === "jeonse" ? 200 : 90;
  const spread = kind === "jeonse" ? 280 : 150;
  return base + (h % spread);
}


type KeywordFields = ReturnType<typeof keywordFieldsForSelection>;

function resolveDemandScoreForRow(
  selection: DemandRegionSelection,
  scoreContext: DemandScoreContext,
  regionKey?: string | null
): DistrictDemandScore {
  if (selection.scope === "national") {
    return demandScoreForNational(scoreContext);
  }
  if (selection.scope === "city") {
    return demandScoreForCity(scoreContext, selection.cityId);
  }
  const key = regionKey ?? demandDistrictRegionKey(selection.cityId, selection.guSlug);
  return districtDemandScoreForRegionKey(scoreContext, key);
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
  const districtShowsNationalBasket = demandDistrictSearchExcludedFromHub(selection.scope);
  const phraseSelection: DemandRegionSelection = districtShowsNationalBasket
    ? { scope: "national" }
    : selection;

  const phrases =
    buildRegionSearchPhrases(phraseSelection) ?? buildRegionSearchPhrases({ scope: "national" })!;
  const volBase = volumeBaseForScope(districtShowsNationalBasket ? "national" : selection.scope);
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
    keywordDailyIndexByYmd: bundle.dailyIndexByYmd,
    keywordSource: bundle.source,
    keywordIndexLevel: bundle.indexLevel,
    keywordVolumeLevel: bundle.volumeLevel,
    keywordIndexLevelByKey: bundle.indexLevelByKey,
    keywordVolumeLevelByKey: bundle.volumeLevelByKey,
    searchVolumeDisplaySource: bundle.searchVolumeDisplaySource,
    searchVolumeRollingSnapshotDate: bundle.searchVolumeRollingSnapshotDate,
  };
}

export function buildDemandScopeRow(
  selection: DemandRegionSelection,
  rtmsOverrides?: DemandRtmsDistrictOverrides,
  keywordStore?: DemandKeywordStore | null,
  scoreContext?: DemandScoreContext | null
): DemandScopeTableRow | null {
  const pathLabel = formatDemandRegionLabel(selection);
  if (!pathLabel) return null;

  const ctx = scoreContext ?? buildDemandScoreContext(keywordStore, null, {});
  const kw = keywordFieldsForSelection(selection, keywordStore);

  if (selection.scope === "national") {
    const agg = seoulAggregateTrade();
    const demandScore = resolveDemandScoreForRow(selection, ctx);
    return {
      selection,
      scope: "national",
      label: "전국",
      pathLabel,
      slug: null,
      hasDetail: false,
      indexScore: demandScore.score,
      saleCount: Math.round(agg.saleCount * 4.2),
      saleMom: agg.saleMom,
      jeonseCount: Math.round(agg.jeonseCount * 4.1),
      jeonseMom: agg.jeonseMom,
      demandScore,
      ...kw,
    };
  }

  if (selection.scope === "city") {
    const city = getDemandCity(selection.cityId);
    if (!city) return null;
    const demandScore = resolveDemandScoreForRow(selection, ctx);
    const agg =
      selection.cityId === "seoul"
        ? seoulAggregateTrade()
        : {
            saleCount: pseudoTradeCount(selection.cityId, "sale") * 12,
            jeonseCount: pseudoTradeCount(selection.cityId, "jeonse") * 12,
            saleMom: pseudoMom(`${selection.cityId}:sale`, 10),
            jeonseMom: pseudoMom(`${selection.cityId}:jeonse`, 10),
          };
    return {
      selection,
      scope: "city",
      label: city.fullLabel,
      pathLabel,
      slug: null,
      hasDetail: false,
      indexScore: demandScore.score,
      saleCount: agg.saleCount,
      saleMom: agg.saleMom,
      jeonseCount: agg.jeonseCount,
      jeonseMom: agg.jeonseMom,
      demandScore,
      ...kw,
    };
  }

  const district = getDemandDistrictRef(selection.cityId, selection.guSlug);
  if (!district) return null;
  const regionKey = demandDistrictRegionKey(selection.cityId, selection.guSlug);
  const tableRow =
    selection.cityId === "seoul"
      ? DEMAND_TABLE_ROWS.find((r) => r.slug === selection.guSlug)
      : undefined;
  const rtms = rtmsOverrides?.[regionKey];
  const saleMom = rtms?.saleMom ?? tableRow?.saleMom ?? pseudoMom(`${regionKey}:sale`, 12);
  const jeonseMom = rtms?.jeonseMom ?? tableRow?.jeonseMom ?? pseudoMom(`${regionKey}:jeonse`, 12);
  const demandScore = resolveDemandScoreForRow(selection, ctx, regionKey);
  return {
    selection,
    scope: "district",
    label: district.gu,
    pathLabel,
    slug: district.slug,
    hasDetail: tableRow?.hasDetail ?? false,
    indexScore: demandScore.score,
    saleCount: rtms?.saleCount ?? tableRow?.saleCount ?? pseudoTradeCount(regionKey, "sale"),
    saleMom,
    jeonseCount: rtms?.jeonseCount ?? tableRow?.jeonseCount ?? pseudoTradeCount(regionKey, "jeonse"),
    jeonseMom,
    demandScore,
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
  keywordStore?: DemandKeywordStore | null,
  scoreContext?: DemandScoreContext | null
): DemandScopeTableRow[] {
  return selections
    .map((s) => buildDemandScopeRow(s, rtmsOverrides, keywordStore, scoreContext))
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
  const sel = row.selection;
  if (sel.scope === "national") return "national:kr";
  if (sel.scope === "city") return `city:${sel.cityId}`;
  return `district:${demandDistrictRegionKey(sel.cityId, sel.guSlug)}`;
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

/** KST 말일 기준 최근 N일 — 「YYYY년 M월 D일」 */
function lastNDayPeriodLabels(endYmd: string, n: number): string[] {
  return lastKstChartDays(endYmd, n).map((d) => d.period);
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

function buildDemandScoreChartSeries(
  row: DemandScopeTableRow,
  range: DemandAnyChartRange,
  rtmsSeries?: DemandRtmsSeriesStore,
  keywordStore?: DemandKeywordStore | null,
  scoreContext?: DemandScoreContext | null
): {
  points: DemandChartPoint[];
  subtitle: string;
} {
  const ds = row.demandScore;
  const months = range === "3y" ? 36 : 12;
  let rtmsMonths = 0;

  if (row.scope === "national") {
    const all = nationalInterestMonthlyPoints(keywordStore);
    const points = all.slice(-months);
    if (points.length >= 2) {
      return {
        points,
        subtitle: `전국 · ${formatDemandScoreBasis(ds.basis)} · ${points.length}개월`,
      };
    }
  } else {
    const rtmsKey = demandRtmsSeriesKeyForRow(row);
    rtmsMonths = rtmsSeries?.[rtmsKey]?.length ?? 0;
    if (rtmsMonths === 0) {
      return {
        points: [],
        subtitle: `지역 RTMS 월별 데이터 없음(로그인·지역 확인 후 로드) · ${formatDemandScoreBasis(ds.basis)}`,
      };
    }
    const all = buildDistrictMoveInDemandScoreChartSeries(
      keywordStore,
      rtmsSeries ?? {},
      demandRtmsSeriesKeyForRow(row),
      scoreContext
    );
    const points = all.slice(-months);
    if (points.length >= 2) {
      return {
        points,
        subtitle: `${row.pathLabel} · ${formatDemandScoreBasis(ds.basis)} · ${points.length}개월`,
      };
    }
  }

  return {
    points: [],
    subtitle:
      row.scope === "national"
        ? `전국 검색·RTMS 월별 데이터가 2개월 이상 겹칠 때 표시 · ${formatDemandScoreBasis(ds.basis)}`
        : rtmsMonths < 2
          ? `RTMS ${rtmsMonths}개월 — 2개월 이상 필요 · ${formatDemandScoreBasis(ds.basis)}`
          : `월별 추이 — RTMS·검색 데이터가 2개월 이상 겹칠 때 표시 · ${formatDemandScoreBasis(ds.basis)}`,
  };
}

export function buildDemandMetricChartSeries(
  row: DemandScopeTableRow,
  metricId: DemandMetricId,
  range: DemandAnyChartRange = "30d",
  options?: {
    rtmsSeries?: DemandRtmsSeriesStore;
    keywordStore?: DemandKeywordStore | null;
    scoreContext?: DemandScoreContext | null;
  }
): {
  points: DemandChartPoint[];
  chartKind: "trade" | "index" | "indexDelta" | "volume" | "demandScore" | "packingInterest";
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
  const volumeChartEndYmd = defaultSearchVolumeChartEndYmd();
  const dayPeriods = lastNDayPeriodLabels(volumeChartEndYmd, CHART_DAILY_POINTS);
  const monthPeriods = chartMonthPeriods(searchRange);

  if (metricId === "packingVolume" || metricId === "moveInVolume") {
    const slice = metricId === "packingVolume" ? row.packing : row.moveInClean;
    const key = demandKeywordKeyForMetric(metricId);
    const monthlyVol = row.keywordVolumeMonthlySeries?.[key];
    const vol = slice.searchVolumeMonth ?? 0;
    const volumeLive = row.keywordSource?.volume === "live";
    const volumeLevel =
      row.keywordVolumeLevelByKey?.[key] ?? row.keywordVolumeLevel ?? "dummy";
    const volumeHint = demandKeywordVolumeLevelHint(row.selection, volumeLevel);

    if (!isDaily && volumeLive && monthlyVol && monthlyVol.length >= MIN_VOLUME_MONTHLY_FOR_YEAR_CHART) {
      const points = monthlyVol.slice(-12);
      return {
        chartKind: "volume",
        subtitle: `콘솔 월별 검색량 · ${points.length}개월 · ${DEMAND_VOLUME_1Y_SOURCE_NOTE}${volumeHint}`,
        points,
      };
    }

    if (!isDaily && volumeLive && monthlyVol && monthlyVol.length >= 1) {
      const snapCount = monthlyVol.length;
      return {
        chartKind: "volume",
        subtitle: `콘솔 월별 스냅샷 ${snapCount}개월 — 12개월 쌓이면 1년 차트 표시 · ${DEMAND_VOLUME_1Y_SOURCE_NOTE}${volumeHint}`,
        points: [],
      };
    }

    if (isDaily && volumeLive) {
      const rolling = row.searchVolumeDisplaySource === "rolling_30d";
      const anchor = anchorVolumeFromMonthlySeries(monthlyVol);
      const total = rolling
        ? vol > 0 || slice.searchVolumeBelowTen
          ? vol
          : 0
        : anchor?.total ?? (vol > 0 ? vol : 0);
      if (total > 0 || (rolling && slice.searchVolumeBelowTen)) {
        const chartTotal = total > 0 ? total : 1;
        const volumeEndYmd =
          rolling && row.searchVolumeRollingSnapshotDate
            ? row.searchVolumeRollingSnapshotDate
            : volumeChartEndYmd;
        const { points, shaped, endYmd, lastIndexYmd } = buildSearchVolume30dChart({
          totalVolume: chartTotal,
          indexSeries: row.keywordDailySeries?.[key],
          dailyIndexByYmd: row.keywordDailyIndexByYmd?.[key],
          endYmd: volumeEndYmd,
          days: CHART_DAILY_POINTS,
        });
        const shapeNote = shaped ? DEMAND_VOLUME_30D_INDEX_SHAPE_NOTE : DEMAND_VOLUME_30D_FLAT_NOTE;
        const collected =
          rolling && row.searchVolumeRollingSnapshotDate
            ? row.searchVolumeRollingSnapshotDate.slice(5).replace("-", "/")
            : null;
        const endLabel = endYmd.slice(5).replace("-", "/");
        const indexEndLabel = lastIndexYmd ? lastIndexYmd.slice(5).replace("-", "/") : null;
        const lagNote =
          indexEndLabel && collected && indexEndLabel !== collected
            ? ` · 지수 ~${indexEndLabel}`
            : "";
        const subtitle = rolling
          ? `최근 30일 ${total.toLocaleString("ko-KR")}건 · ${shapeNote} · 검색량 ${collected ?? endLabel} 기준${lagNote}${volumeHint}`
          : `콘솔 ${anchor?.monthLabel ?? "—"} 합계 ${total.toLocaleString("ko-KR")}건 · 최근 ${CHART_DAILY_POINTS}일 · ${shapeNote} · 말일 ${endLabel}${volumeHint}`;
        return {
          chartKind: "volume",
          subtitle,
          points: total > 0 ? points : [],
        };
      }
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
        ? `1년 검색량 — 콘솔 월별 스냅샷 필요 · ${DEMAND_VOLUME_1Y_SOURCE_NOTE}${volumeHint}`
        : `검색량 데이터 없음`,
      points: [],
    };
  }

  if (metricId === "packingIndex" || metricId === "moveInIndex") {
    const slice = metricId === "packingIndex" ? row.packing : row.moveInClean;
    const key = demandKeywordKeyForMetric(metricId);
    const rowSeries = row.keywordDailySeries?.[key];
    const monthlySeries = row.keywordMonthlyIndexSeries?.[key];
    const indexLevel =
      row.keywordIndexLevelByKey?.[key] ?? row.keywordIndexLevel ?? "dummy";
    const indexLive = demandKeywordHasIndexData(row, key);
    const liveDaily = isDaily && indexLive && (rowSeries?.length ?? 0) > 0;
    const levelHint = demandKeywordIndexLevelHint(row.selection, indexLevel);

    if (liveDaily && rowSeries && isDaily) {
      const points = rowSeries.slice(-CHART_DAILY_POINTS);
      return {
        chartKind: "index",
        subtitle: `${slice.keyword} · 검색지수 · 최근 ${points.length}일${levelHint}`,
        points,
      };
    }

    if (
      searchRange === "1y" &&
      indexLive &&
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
      indexLive &&
      monthlySeries &&
      monthlySeries.length >= MIN_MONTHLY_POINTS_FOR_YEAR_CHART
    ) {
      const points = monthlySeries.slice(-12);
      return {
        chartKind: "index",
        subtitle: `${slice.keyword} · 검색지수 · ${points.length}개월${levelHint}`,
        points,
      };
    }

    const periods = isDaily ? dayPeriods : monthPeriods;
    const noDataNote =
      indexLevel === "dummy"
        ? " · 구별·전국 지수 미수집(데이터랩 수집 필요)"
        : "";
    return {
      chartKind: "indexDelta",
      subtitle: isDaily
        ? `키워드 「${slice.keyword}」 · 최근 ${CHART_DAILY_POINTS}일 전일 대비 % (더미)${noDataNote}${levelHint}`
        : `키워드 「${slice.keyword}」 · 월별 지수 변화 (더미)${noDataNote}${levelHint}`,
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

  if (metricId === "demandScore") {
    const scoreRange: DemandAnyChartRange =
      range === "3y" ? "3y" : range === "1y" ? "1y" : "1y";
    const yearSeries = buildDemandScoreChartSeries(
      row,
      scoreRange,
      options?.rtmsSeries,
      options?.keywordStore,
      options?.scoreContext
    );
    return {
      chartKind: "demandScore",
      subtitle: yearSeries.subtitle,
      points: yearSeries.points,
    };
  }

  if (metricId === "packingInterest") {
    const volMonths = row.keywordVolumeMonthlySeries?.packing ?? [];
    const idxMonths = row.keywordMonthlyIndexSeries?.packing ?? [];
    const livePoints = buildPackingInterestMonthlyChartPoints(volMonths, idxMonths);
    if (livePoints.length >= 2) {
      return {
        chartKind: "packingInterest",
        subtitle: `포장이사 관심지수 · 최근 ${livePoints.length}개월 (참고용)`,
        points: livePoints,
      };
    }
    const anchor = computePackingInterestScore(row.packing);
    const months = chartMonthPeriods("1y");
    return {
      chartKind: "packingInterest",
      subtitle: "포장이사 관심지수 · 월별 추이 (참고용)",
      points: buildPackingInterestDummyMonthlyPoints(
        `${demandScopeChartSeed(row)}:packing-interest`,
        anchor,
        months
      ),
    };
  }

  throw new Error(`Unsupported metric: ${metricId satisfies never}`);
}

function demandScopeChartSeed(row: DemandScopeTableRow): string {
  const sel = row.selection;
  if (sel.scope === "national") return "national";
  if (sel.scope === "city") return `city:${sel.cityId}`;
  return demandDistrictRegionKey(sel.cityId, sel.guSlug);
}
