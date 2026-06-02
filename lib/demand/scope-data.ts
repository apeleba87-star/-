import { DEMAND_SNAPSHOT_META, getDemandDistrictBySlug } from "@/lib/demand/dummy-data";
import { DEMAND_DAILY_NATIONAL_KEYWORDS, DEMAND_TODAY_META } from "@/lib/demand/dummy-daily";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";
import type { DemandMetricId } from "@/lib/demand/metrics";
import {
  formatDemandRegionLabel,
  type DemandRegionScope,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { guNameToSlug } from "@/lib/demand/slugs";
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

const CHART_DAILY_POINTS = 30;

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

function packingKeywordForScope(scope: DemandRegionScope, gu?: string): string {
  if (scope === "national") return "포장이사";
  if (scope === "city") return "서울 포장이사";
  return `${gu ?? ""} 포장이사`;
}

function moveInKeywordForScope(scope: DemandRegionScope, gu?: string): string {
  if (scope === "national") return "입주청소";
  if (scope === "city") return "서울 입주청소";
  return `${gu ?? ""} 입주청소`;
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

export function buildDemandScopeRow(
  selection: DemandRegionSelection,
  rtmsOverrides?: DemandRtmsDistrictOverrides
): DemandScopeTableRow | null {
  const pathLabel = formatDemandRegionLabel(selection);
  if (!pathLabel) return null;

  if (selection.scope === "national") {
    const agg = seoulAggregateTrade();
    const packingKw = packingKeywordForScope("national");
    const moveInKw = moveInKeywordForScope("national");
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
      packing: searchSliceForKeyword(packingKw, 124_000),
      moveInClean: searchSliceForKeyword(moveInKw, 87_000),
    };
  }

  if (selection.scope === "city") {
    const agg = seoulAggregateTrade();
    const packingKw = packingKeywordForScope("city");
    const moveInKw = moveInKeywordForScope("city");
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
      packing: searchSliceForKeyword(packingKw, 42_000),
      moveInClean: searchSliceForKeyword(moveInKw, 28_000),
    };
  }

  const tableRow = DEMAND_TABLE_ROWS.find((r) => r.slug === selection.guSlug);
  if (!tableRow) return null;
  const district = getDemandDistrictBySlug(selection.guSlug);
  const packingKw = packingKeywordForScope("district", tableRow.gu);
  const moveInKw = moveInKeywordForScope("district", tableRow.gu);

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
    packing: searchSliceForKeyword(packingKw, 8_000),
    moveInClean: searchSliceForKeyword(moveInKw, 5_500),
  };
}

export function buildDemandScopeRows(selections: DemandRegionSelection[]): DemandScopeTableRow[] {
  return selections
    .map((s) => buildDemandScopeRow(s))
    .filter((r): r is DemandScopeTableRow => r != null);
}

export function buildDemandScopeRowsWithRtms(
  selections: DemandRegionSelection[],
  rtmsOverrides: DemandRtmsDistrictOverrides
): DemandScopeTableRow[] {
  return selections
    .map((s) => buildDemandScopeRow(s, rtmsOverrides))
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

function buildDailyTradePoints(
  seed: string,
  count: number,
  mom: number,
  periods: string[]
): DemandChartPoint[] {
  const h = hashSeed(seed);
  const last = periods.length - 1;
  const base = count / 1.05;
  return periods.map((period, i) => {
    const drift = 1 + (mom / 100) * (last <= 0 ? 0 : i / last);
    const wobble = 0.9 + ((h + i * 23) % 20) / 100;
    const noise = 0.97 + ((h + i * 11) % 7) / 100;
    return {
      period,
      value: Math.max(5, Math.round(base * drift * wobble * noise)),
    };
  });
}

function buildDailyVolumePoints(
  seed: string,
  volumeMonth: number,
  periods: string[]
): DemandChartPoint[] {
  const h = hashSeed(seed);
  const dailyMean = volumeMonth / Math.max(periods.length, 1);
  return periods.map((period, i) => ({
    period,
    value: Math.max(0, Math.round(dailyMean * (0.72 + ((h + i * 17) % 56) / 100))),
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
  range: DemandChartRange = "30d"
): {
  points: DemandChartPoint[];
  chartKind: "trade" | "index" | "indexDelta" | "volume" | "composite";
  subtitle: string;
} {
  const seed = `${demandScopeChartSeed(row)}:${metricId}`;
  const h = hashSeed(seed);
  const isDaily = range === "30d";
  const dayPeriods = lastNDayPeriodLabels(DEMAND_TODAY_META.briefingDateYmd, CHART_DAILY_POINTS);
  const monthPeriods = chartMonthPeriods(range);

  if (metricId === "packingVolume" || metricId === "moveInVolume") {
    const slice = metricId === "packingVolume" ? row.packing : row.moveInClean;
    const vol = slice.searchVolumeMonth ?? 0;
    if (isDaily) {
      return {
        chartKind: "volume",
        subtitle: `키워드 「${slice.keyword}」 · 최근 ${CHART_DAILY_POINTS}일 일별 추정 (더미)`,
        points: buildDailyVolumePoints(seed, vol, dayPeriods),
      };
    }
    return {
      chartKind: "volume",
      subtitle: `키워드 「${slice.keyword}」 · 월별 검색량 추정 (더미)`,
      points: monthPeriods.map((period, i) => ({
        period,
        value: Math.max(0, Math.round(vol * (0.82 + ((h + i * 17) % 28) / 100))),
      })),
    };
  }

  if (metricId === "packingIndex" || metricId === "moveInIndex") {
    const slice = metricId === "packingIndex" ? row.packing : row.moveInClean;
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

  const isSale = metricId === "sale";
  const count = isSale ? row.saleCount : row.jeonseCount;
  const mom = isSale ? row.saleMom : row.jeonseMom;
  const tradeLabel = isSale ? "매매" : "전월세";

  if (isDaily) {
    return {
      chartKind: "trade",
      subtitle: `${row.pathLabel} · RTMS 아파트 ${tradeLabel} 최근 ${CHART_DAILY_POINTS}일 (더미)`,
      points: buildDailyTradePoints(seed, count, mom, dayPeriods),
    };
  }

  const last = monthPeriods.length - 1;
  return {
    chartKind: "trade",
    subtitle: `${row.pathLabel} · RTMS 아파트 ${tradeLabel} 월별 건수 (더미)`,
    points: monthPeriods.map((period, i) => {
      const drift = 1 + (mom / 100) * (last <= 0 ? 0 : i / last);
      const wobble = 0.88 + ((h + i * 23) % 24) / 100;
      return {
        period,
        value: Math.max(10, Math.round((count / 1.1) * drift * wobble)),
      };
    }),
  };
}

function demandScopeChartSeed(row: DemandScopeTableRow): string {
  if (row.scope === "national") return "national";
  if (row.scope === "city") return "city:seoul";
  return row.slug ?? row.label;
}
