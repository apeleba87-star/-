import { DEMAND_KEYWORD_KEYS, type DemandKeywordKey } from "@/lib/demand/keyword-keys";
import type { DemandKeywordRegionBundle, DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";
import {
  buildRegionSearchPhrases,
  demandKeywordRegionRefFromSelection,
  demandKeywordRegionStoreKey,
} from "@/lib/demand/region-search-keywords";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import {
  countDailyIndexInChartWindow,
  defaultSearchVolumeChartEndYmd,
} from "@/lib/demand/search-volume-30d";
import {
  buildHandFreeForwardVolumeSeries,
  handFreeForwardDataReady,
} from "@/lib/demand/hand-free-forward";
import { demandDistrictSearchExcludedFromHub } from "@/lib/demand/district-search-archive";
import { demandIsIncompleteSearchVolumeMonth } from "@/lib/demand/searchad-month-report";

export type DemandKeywordIndexLevel = "district" | "city" | "national" | "dummy";

export type DemandKeywordResolvedBundle = DemandKeywordRegionBundle & {
  indexLevel: DemandKeywordIndexLevel;
  volumeLevel: DemandKeywordIndexLevel;
  indexLevelByKey: Record<DemandKeywordKey, DemandKeywordIndexLevel>;
  volumeLevelByKey: Record<DemandKeywordKey, DemandKeywordIndexLevel>;
};

type DemandKeywordDailyRow = {
  periodDate: string;
  indexRatio: number;
};

const EMPTY_SERIES: Record<DemandKeywordKey, { period: string; value: number }[]> = {
  packing: [],
  move_in_clean: [],
};

function periodDateToChartLabel(periodDate: string): string {
  const [y, m, d] = periodDate.split("-");
  if (!y || !m || !d) return periodDate;
  return `${y.slice(2)}.${Number(m)}.${Number(d)}`;
}

function periodMonthToChartLabel(periodDate: string): string {
  const [y, m] = periodDate.split("-");
  if (!y || !m) return periodDate;
  const year = y.length === 4 ? Number(y) : Number(`20${y}`);
  return `${year}년 ${Number(m)}월`;
}

function indexDeltaPercent(curr: number, prev: number): number {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function momFromDaily(rows: DemandKeywordDailyRow[]): number {
  if (rows.length < 14) return 0;
  const sorted = [...rows].sort((a, b) => a.periodDate.localeCompare(b.periodDate));
  const recent = sorted.slice(-30);
  const prior = sorted.slice(-60, -30);
  if (recent.length === 0 || prior.length === 0) return 0;
  const avgRecent = recent.reduce((s, r) => s + r.indexRatio, 0) / recent.length;
  const avgPrior = prior.reduce((s, r) => s + r.indexRatio, 0) / prior.length;
  return indexDeltaPercent(avgRecent, avgPrior);
}

function dodFromDaily(rows: DemandKeywordDailyRow[]): number {
  const sorted = [...rows].sort((a, b) => a.periodDate.localeCompare(b.periodDate));
  if (sorted.length < 2) return 0;
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  return indexDeltaPercent(last.indexRatio, prev.indexRatio);
}

function aggregateDailyToMonthlyRows(rows: DemandKeywordDailyRow[]): DemandKeywordDailyRow[] {
  const byMonth = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const ym = r.periodDate.slice(0, 7);
    const cur = byMonth.get(ym) ?? { sum: 0, n: 0 };
    cur.sum += r.indexRatio;
    cur.n += 1;
    byMonth.set(ym, cur);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, { sum, n }]) => ({
      periodDate: `${ym}-01`,
      indexRatio: n > 0 ? sum / n : 0,
    }));
}

function toDailyIndexByYmd(rows: DemandKeywordDailyRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const ymd = r.periodDate.slice(0, 10);
    if (ymd.length === 10) out[ymd] = (out[ymd] ?? 0) + r.indexRatio;
  }
  return out;
}

function toDailyIndexChartSeries(rows: DemandKeywordDailyRow[], maxPoints = 30) {
  const sorted = [...rows]
    .sort((a, b) => a.periodDate.localeCompare(b.periodDate))
    .slice(-maxPoints);
  return sorted.map((r) => ({
    period: periodDateToChartLabel(r.periodDate),
    value: Math.round(r.indexRatio * 10) / 10,
  }));
}

function toMonthlyIndexChartSeries(rows: DemandKeywordDailyRow[], maxMonths = 12) {
  const sorted = [...rows]
    .sort((a, b) => a.periodDate.localeCompare(b.periodDate))
    .slice(-maxMonths);
  return sorted.map((r) => ({
    period: periodMonthToChartLabel(r.periodDate),
    value: Math.round(r.indexRatio * 10) / 10,
  }));
}

type VolumeMonthRow = { yyyymm: string; volume: number | null; belowTen: boolean };

function toVolumeMonthlyChartSeries(rows: VolumeMonthRow[], maxMonths = 12) {
  const sorted = [...rows]
    .filter((r) => !demandIsIncompleteSearchVolumeMonth(r.yyyymm))
    .sort((a, b) => a.yyyymm.localeCompare(b.yyyymm))
    .slice(-maxMonths);
  return sorted.map((r) => ({
    period: periodMonthToChartLabel(`${r.yyyymm}-01`),
    value: r.belowTen || r.volume == null ? 0 : r.volume,
  }));
}

function bundleHasVolumeForKeyword(
  bundle: DemandKeywordRegionBundle,
  keywordKey: DemandKeywordKey
): boolean {
  if (bundle.volumeMonthlySeries[keywordKey].length > 0) return true;
  const slice = keywordKey === "packing" ? bundle.packing : bundle.moveInClean;
  return bundle.source.volume === "live" && (slice.searchVolumeMonth != null || slice.searchVolumeBelowTen);
}

function bundleHasIndexForKeyword(
  bundle: DemandKeywordRegionBundle,
  keywordKey: DemandKeywordKey
): boolean {
  return (
    bundle.dailySeries[keywordKey].length > 0 || bundle.monthlyIndexSeries[keywordKey].length > 0
  );
}

function monthlyRowsForChart(
  monthly: DemandKeywordDailyRow[],
  daily: DemandKeywordDailyRow[]
): DemandKeywordDailyRow[] {
  if (monthly.length > 0) return monthly;
  return aggregateDailyToMonthlyRows(daily);
}

function bundleHasIndexSeries(bundle: DemandKeywordRegionBundle): boolean {
  return DEMAND_KEYWORD_KEYS.some(
    (k) => bundle.dailySeries[k].length > 0 || bundle.monthlyIndexSeries[k].length > 0
  );
}

export function bundleDemandKeywordFromRows(
  phrases: { packing: string; moveInClean: string },
  daily: Record<DemandKeywordKey, DemandKeywordDailyRow[]>,
  monthly: Record<DemandKeywordKey, DemandKeywordDailyRow[]>,
  volume: Partial<Record<DemandKeywordKey, { volume: number | null; belowTen: boolean }>>,
  volumeMonthly: Partial<Record<DemandKeywordKey, VolumeMonthRow[]>>,
  fallback: { packing: DemandKeywordMetricSlice; moveInClean: DemandKeywordMetricSlice },
  handFreeByPhrase: Record<string, VolumeMonthRow[]> = {},
  volumeMeta?: {
    rollingSnapshotDate?: string | null;
    fromRolling?: boolean;
  }
): DemandKeywordRegionBundle {
  const hasPackingDaily = daily.packing.length > 0;
  const hasMoveInDaily = daily.move_in_clean.length > 0;
  const packingMonthlyRows = monthlyRowsForChart(monthly.packing, daily.packing);
  const moveInMonthlyRows = monthlyRowsForChart(monthly.move_in_clean, daily.move_in_clean);
  const hasPackingMonthly = packingMonthlyRows.length > 0;
  const hasMoveInMonthly = moveInMonthlyRows.length > 0;

  const packingSlice: DemandKeywordMetricSlice = hasPackingDaily
    ? {
        searchVolumeMonth: volume.packing?.volume ?? fallback.packing.searchVolumeMonth,
        searchVolumeBelowTen: volume.packing?.belowTen ?? false,
        indexMomPercent: momFromDaily(daily.packing),
        indexDodPercent: dodFromDaily(daily.packing),
      }
    : {
        ...fallback.packing,
        ...(volume.packing != null
          ? {
              searchVolumeMonth: volume.packing.volume,
              searchVolumeBelowTen: volume.packing.belowTen,
            }
          : {}),
      };

  const moveInSlice: DemandKeywordMetricSlice = hasMoveInDaily
    ? {
        searchVolumeMonth: volume.move_in_clean?.volume ?? fallback.moveInClean.searchVolumeMonth,
        searchVolumeBelowTen: volume.move_in_clean?.belowTen ?? false,
        indexMomPercent: momFromDaily(daily.move_in_clean),
        indexDodPercent: dodFromDaily(daily.move_in_clean),
      }
    : {
        ...fallback.moveInClean,
        ...(volume.move_in_clean != null
          ? {
              searchVolumeMonth: volume.move_in_clean.volume,
              searchVolumeBelowTen: volume.move_in_clean.belowTen,
            }
          : {}),
      };

  const packingVolMonths = volumeMonthly.packing ?? [];
  const moveInVolMonths = volumeMonthly.move_in_clean ?? [];
  const handFreeForwardSeries = buildHandFreeForwardVolumeSeries(handFreeByPhrase);

  return {
    phrases,
    packing: packingSlice,
    moveInClean: moveInSlice,
    dailySeries: {
      packing: toDailyIndexChartSeries(daily.packing),
      move_in_clean: toDailyIndexChartSeries(daily.move_in_clean),
    },
    monthlyIndexSeries: {
      packing: toMonthlyIndexChartSeries(packingMonthlyRows),
      move_in_clean: toMonthlyIndexChartSeries(moveInMonthlyRows),
    },
    volumeMonthlySeries: {
      packing: toVolumeMonthlyChartSeries(packingVolMonths),
      move_in_clean: toVolumeMonthlyChartSeries(moveInVolMonths),
    },
    handFreeVolumeByPhrase: handFreeByPhrase,
    handFreeVolumeMonthlySeries: handFreeForwardSeries,
    dailyIndexByYmd: {
      packing: toDailyIndexByYmd(daily.packing),
      move_in_clean: toDailyIndexByYmd(daily.move_in_clean),
    },
    source: {
      datalab:
        hasPackingDaily || hasMoveInDaily || hasPackingMonthly || hasMoveInMonthly ? "live" : "dummy",
      volume:
        packingVolMonths.length > 0 ||
        moveInVolMonths.length > 0 ||
        volume.packing != null ||
        volume.move_in_clean != null
          ? "live"
          : "dummy",
    },
    searchVolumeRollingSnapshotDate: volumeMeta?.rollingSnapshotDate ?? null,
    searchVolumeDisplaySource: volumeMeta?.fromRolling ? "rolling_30d" : "monthly_archive",
  };
}

const FALLBACK_CHAIN: Array<(sel: DemandRegionSelection) => string | null> = [
  (sel) => {
    const ref = demandKeywordRegionRefFromSelection(sel);
    return ref ? demandKeywordRegionStoreKey(ref) : null;
  },
  (sel) => {
    if (sel.scope === "district") {
      return demandKeywordRegionStoreKey({ regionScope: "city", regionKey: sel.cityId });
    }
    return null;
  },
  () => demandKeywordRegionStoreKey({ regionScope: "national", regionKey: "kr" }),
];

/** 구 선택 시 구별 행 스킵 — 서울·전국 Basket만 표시 */
const DISTRICT_DISPLAY_FALLBACK_CHAIN: Array<(sel: DemandRegionSelection) => string | null> = [
  (sel) => {
    if (sel.scope === "district") {
      return demandKeywordRegionStoreKey({ regionScope: "city", regionKey: sel.cityId });
    }
    return null;
  },
  () => demandKeywordRegionStoreKey({ regionScope: "national", regionKey: "kr" }),
];

function fallbackChainForSelection(
  selection: DemandRegionSelection
): Array<(sel: DemandRegionSelection) => string | null> {
  if (demandDistrictSearchExcludedFromHub(selection.scope)) {
    return DISTRICT_DISPLAY_FALLBACK_CHAIN;
  }
  return FALLBACK_CHAIN;
}

function levelFromStoreKey(key: string | null): DemandKeywordIndexLevel {
  if (!key) return "dummy";
  if (key.startsWith("district:")) return "district";
  if (key.startsWith("city:")) return "city";
  return "national";
}

function pickFromChain(
  store: DemandKeywordStore,
  selection: DemandRegionSelection,
  match: (bundle: DemandKeywordRegionBundle) => boolean
): { key: string; bundle: DemandKeywordRegionBundle } | null {
  for (const pickKey of fallbackChainForSelection(selection)) {
    const key = pickKey(selection);
    if (!key) continue;
    const bundle = store.byRegion[key];
    if (bundle && match(bundle)) {
      return { key, bundle };
    }
  }
  return null;
}

/** 30일 검색량 배분용 — 구 일별 부족 시 시·전국 DataLab 일별(최근 30일 7일+) */
function pickDailyIndexByYmdFromChain(
  store: DemandKeywordStore,
  selection: DemandRegionSelection,
  keywordKey: DemandKeywordKey,
  minDays = 7
): Record<string, number> {
  const endYmd = defaultSearchVolumeChartEndYmd();
  for (const pickKey of fallbackChainForSelection(selection)) {
    const key = pickKey(selection);
    if (!key) continue;
    const byYmd = store.byRegion[key]?.dailyIndexByYmd[keywordKey] ?? {};
    if (countDailyIndexInChartWindow(byYmd, endYmd, 30) >= minDays) return byYmd;
  }
  return {};
}

export function resolveDemandKeywordBundle(
  store: DemandKeywordStore,
  selection: DemandRegionSelection,
  fallbackNational: { packing: DemandKeywordMetricSlice; moveInClean: DemandKeywordMetricSlice }
): DemandKeywordResolvedBundle {
  const phrases =
    buildRegionSearchPhrases(selection) ??
    buildRegionSearchPhrases({ scope: "national" }) ?? {
      packing: "포장이사",
      moveInClean: "입주청소",
    };

  const packingIndexPick = pickFromChain(store, selection, (b) =>
    bundleHasIndexForKeyword(b, "packing")
  );
  const moveInIndexPick = pickFromChain(store, selection, (b) =>
    bundleHasIndexForKeyword(b, "move_in_clean")
  );
  const packingVolPick = pickFromChain(store, selection, (b) =>
    bundleHasVolumeForKeyword(b, "packing")
  );
  const moveInVolPick = pickFromChain(store, selection, (b) =>
    bundleHasVolumeForKeyword(b, "move_in_clean")
  );

  const hasAny =
    packingIndexPick ||
    moveInIndexPick ||
    packingVolPick ||
    moveInVolPick;

  if (!hasAny) {
    const empty = bundleDemandKeywordFromRows(
      phrases,
      { packing: [], move_in_clean: [] },
      { packing: [], move_in_clean: [] },
      {},
      {},
      fallbackNational
    );
    const dummyLevels = {
      packing: "dummy" as const,
      move_in_clean: "dummy" as const,
    };
    return {
      ...empty,
      indexLevel: "dummy",
      volumeLevel: "dummy",
      indexLevelByKey: dummyLevels,
      volumeLevelByKey: dummyLevels,
    };
  }

  const packingIndexBundle = packingIndexPick?.bundle;
  const moveInIndexBundle = moveInIndexPick?.bundle;
  const packingVolBundle = packingVolPick?.bundle;
  const moveInVolBundle = moveInVolPick?.bundle;

  const indexLevelByKey: Record<DemandKeywordKey, DemandKeywordIndexLevel> = {
    packing: levelFromStoreKey(packingIndexPick?.key ?? null),
    move_in_clean: levelFromStoreKey(moveInIndexPick?.key ?? null),
  };
  const volumeLevelByKey: Record<DemandKeywordKey, DemandKeywordIndexLevel> = {
    packing: levelFromStoreKey(packingVolPick?.key ?? null),
    move_in_clean: levelFromStoreKey(moveInVolPick?.key ?? null),
  };

  const primaryIndexLevel =
    selection.scope === "district"
      ? indexLevelByKey.packing === "district" || indexLevelByKey.move_in_clean === "district"
        ? "district"
        : indexLevelByKey.packing === "city" || indexLevelByKey.move_in_clean === "city"
          ? "city"
          : "national"
      : indexLevelByKey.packing !== "dummy"
        ? indexLevelByKey.packing
        : indexLevelByKey.move_in_clean;

  const primaryVolumeLevel =
    selection.scope === "district"
      ? volumeLevelByKey.packing === "district" || volumeLevelByKey.move_in_clean === "district"
        ? "district"
        : volumeLevelByKey.packing === "city" || volumeLevelByKey.move_in_clean === "city"
          ? "city"
          : "national"
      : volumeLevelByKey.packing !== "dummy"
        ? volumeLevelByKey.packing
        : volumeLevelByKey.move_in_clean;

  return {
    phrases,
    packing: {
      ...(packingIndexBundle?.packing ?? fallbackNational.packing),
      searchVolumeMonth:
        packingVolBundle?.packing.searchVolumeMonth ?? fallbackNational.packing.searchVolumeMonth,
      searchVolumeBelowTen:
        packingVolBundle?.packing.searchVolumeBelowTen ??
        fallbackNational.packing.searchVolumeBelowTen,
    },
    moveInClean: {
      ...(moveInIndexBundle?.moveInClean ?? fallbackNational.moveInClean),
      searchVolumeMonth:
        moveInVolBundle?.moveInClean.searchVolumeMonth ??
        fallbackNational.moveInClean.searchVolumeMonth,
      searchVolumeBelowTen:
        moveInVolBundle?.moveInClean.searchVolumeBelowTen ??
        fallbackNational.moveInClean.searchVolumeBelowTen,
    },
    dailySeries: {
      packing: packingIndexBundle?.dailySeries.packing ?? [],
      move_in_clean: moveInIndexBundle?.dailySeries.move_in_clean ?? [],
    },
    monthlyIndexSeries: {
      packing: packingIndexBundle?.monthlyIndexSeries.packing ?? [],
      move_in_clean: moveInIndexBundle?.monthlyIndexSeries.move_in_clean ?? [],
    },
    volumeMonthlySeries: {
      packing: packingVolBundle?.volumeMonthlySeries.packing ?? [],
      move_in_clean: moveInVolBundle?.volumeMonthlySeries.move_in_clean ?? [],
    },
    handFreeVolumeByPhrase:
      store.byRegion[
        demandKeywordRegionStoreKey({ regionScope: "national", regionKey: "kr" })
      ]?.handFreeVolumeByPhrase ?? {},
    handFreeVolumeMonthlySeries:
      store.byRegion[
        demandKeywordRegionStoreKey({ regionScope: "national", regionKey: "kr" })
      ]?.handFreeVolumeMonthlySeries ?? [],
    dailyIndexByYmd: {
      packing: pickDailyIndexByYmdFromChain(store, selection, "packing"),
      move_in_clean: pickDailyIndexByYmdFromChain(store, selection, "move_in_clean"),
    },
    source: {
      datalab:
        packingIndexBundle?.source.datalab === "live" ||
        moveInIndexBundle?.source.datalab === "live"
          ? "live"
          : "dummy",
      volume:
        packingVolBundle?.source.volume === "live" ||
        moveInVolBundle?.source.volume === "live"
          ? "live"
          : "dummy",
    },
    searchVolumeRollingSnapshotDate:
      packingVolBundle?.searchVolumeRollingSnapshotDate ??
      moveInVolBundle?.searchVolumeRollingSnapshotDate ??
      null,
    searchVolumeDisplaySource:
      packingVolBundle?.searchVolumeDisplaySource === "rolling_30d" ||
      moveInVolBundle?.searchVolumeDisplaySource === "rolling_30d"
        ? "rolling_30d"
        : "monthly_archive",
    indexLevel: primaryIndexLevel,
    volumeLevel: primaryVolumeLevel,
    indexLevelByKey,
    volumeLevelByKey,
  };
}

function levelHintForScope(
  selection: DemandRegionSelection,
  level: DemandKeywordIndexLevel,
  metric: "index" | "volume"
): string {
  if (level === "dummy") return " · 더미";
  if (selection.scope === "district" && level === "national") {
    return metric === "volume"
      ? " · 전국 검색량(이 구 미수집)"
      : " · 전국 데이터(이 구 미수집)";
  }
  if (selection.scope === "district" && level === "city") {
    return metric === "volume"
      ? " · 서울 시 검색량(이 구 미수집)"
      : " · 서울 시 데이터(이 구 미수집)";
  }
  if (level === "district") {
    return metric === "volume" ? " · 검색광고(이 구)" : "";
  }
  return "";
}

export function demandKeywordIndexLevelHint(
  selection: DemandRegionSelection,
  indexLevel: DemandKeywordIndexLevel,
  keywordKey?: DemandKeywordKey
): string {
  return levelHintForScope(selection, indexLevel, "index");
}

export function demandKeywordVolumeLevelHint(
  selection: DemandRegionSelection,
  volumeLevel: DemandKeywordIndexLevel,
  keywordKey?: DemandKeywordKey
): string {
  return levelHintForScope(selection, volumeLevel, "volume");
}
