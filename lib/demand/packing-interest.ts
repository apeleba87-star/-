import { formatSearchIndexPercent, formatSearchVolumeMonth } from "@/lib/demand/copy";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";
import type { DemandChartPoint } from "@/lib/demand/scope-data";

export type PackingInterestSlice = DemandKeywordMetricSlice & { indexRatio?: number };

/** 표시 전용 0–100 (입주 온도·내부 가중 산식과 무관) */
export function computePackingInterestScore(packing: PackingInterestSlice): number {
  const indexLevel = Math.max(0, Math.min(100, packing.indexRatio ?? 52));
  const vol = packing.searchVolumeMonth;
  let volumeLevel = 22;
  if (packing.searchVolumeBelowTen || vol == null) {
    volumeLevel = 6;
  } else if (vol > 0) {
    volumeLevel = Math.min(48, Math.max(10, Math.log10(Math.max(vol, 10)) * 11));
  }
  const changeBump = Math.max(-6, Math.min(6, packing.indexMomPercent * 0.3));
  return Math.round(Math.max(0, Math.min(100, indexLevel * 0.5 + volumeLevel * 0.42 + changeBump)));
}

export function formatPackingInterestSub(packing: PackingInterestSlice): string {
  const scale =
    packing.searchVolumeBelowTen || packing.searchVolumeMonth == null
      ? "규모 —"
      : `규모 ${formatSearchVolumeMonth(packing.searchVolumeMonth)}`;
  return `${scale} · 변화 ${formatSearchIndexPercent(packing.indexMomPercent)}`;
}

function scoreFromVolumeAndIndex(volume: number, indexRatio: number, momHint = 0): number {
  const volumeLevel = volume <= 0 ? 6 : Math.min(48, Math.max(10, Math.log10(Math.max(volume, 10)) * 11));
  const changeBump = Math.max(-6, Math.min(6, momHint * 0.3));
  return Math.round(
    Math.max(0, Math.min(100, indexRatio * 0.5 + volumeLevel * 0.42 + changeBump))
  );
}

/** 월별 검색량·지수 → 관심지수 추이 (표시용) */
export function buildPackingInterestMonthlyChartPoints(
  volumeMonthly: DemandChartPoint[],
  indexMonthly: DemandChartPoint[]
): DemandChartPoint[] {
  const indexByPeriod = new Map(indexMonthly.map((p) => [p.period, p.value]));
  if (volumeMonthly.length >= 2) {
    return volumeMonthly.slice(-12).map((pt, i, arr) => {
      const prev = i > 0 ? arr[i - 1].value : pt.value;
      const momHint =
        prev > 0 ? Math.round(((pt.value - prev) / prev) * 1000) / 10 : 0;
      const indexVal = indexByPeriod.get(pt.period) ?? 52;
      return {
        period: pt.period,
        value: scoreFromVolumeAndIndex(pt.value, indexVal, momHint),
      };
    });
  }
  if (indexMonthly.length >= 2) {
    return indexMonthly.slice(-12).map((pt, i, arr) => {
      const prev = i > 0 ? arr[i - 1].value : pt.value;
      const momHint =
        prev > 0 ? Math.round(((pt.value - prev) / prev) * 1000) / 10 : 0;
      return {
        period: pt.period,
        value: scoreFromVolumeAndIndex(Math.max(pt.value, 1) * 80, pt.value, momHint),
      };
    });
  }
  return [];
}

export function buildPackingInterestDummyMonthlyPoints(
  seed: string,
  anchor: number,
  periods: string[]
): DemandChartPoint[] {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  }
  h = Math.abs(h);
  const last = periods.length - 1;
  return periods.map((period, i) => ({
    period,
    value: Math.max(
      35,
      Math.min(
        98,
        Math.round(anchor - 10 + (last <= 0 ? 0 : (i / last) * 14) + ((h + i * 5) % 9))
      )
    ),
  }));
}
