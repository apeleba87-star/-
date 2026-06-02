import {
  DEMAND_KEYWORD_KEYS,
  type DemandKeywordKey,
} from "@/lib/demand/keyword-keys";
import type { DemandKeywordHubData } from "@/lib/demand/keyword-hub-data";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";
import { getDemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";
import { createServiceSupabase } from "@/lib/supabase-server";

export type { DemandKeywordHubData } from "@/lib/demand/keyword-hub-data";

type DemandKeywordDailyRow = {
  periodDate: string;
  indexRatio: number;
};

function periodDateToChartLabel(periodDate: string): string {
  const [y, m, d] = periodDate.split("-");
  if (!y || !m || !d) return periodDate;
  return `${y.slice(2)}.${Number(m)}.${Number(d)}`;
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

function toChartSeries(
  rows: DemandKeywordDailyRow[],
  maxPoints = 30
): { period: string; value: number }[] {
  const sorted = [...rows]
    .sort((a, b) => a.periodDate.localeCompare(b.periodDate))
    .slice(-maxPoints);
  return sorted.map((r) => ({
    period: periodDateToChartLabel(r.periodDate),
    value: Math.round(r.indexRatio * 10) / 10,
  }));
}

async function loadDailyByKey(): Promise<Record<DemandKeywordKey, DemandKeywordDailyRow[]>> {
  const empty: Record<DemandKeywordKey, DemandKeywordDailyRow[]> = {
    packing: [],
    move_in_clean: [],
  };
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from("demand_keyword_daily")
      .select("keyword_key, period_date, index_ratio")
      .in("keyword_key", [...DEMAND_KEYWORD_KEYS])
      .order("period_date", { ascending: true })
      .limit(500);

    if (error || !data) return empty;

    for (const row of data) {
      const key = String(row.keyword_key) as DemandKeywordKey;
      if (!DEMAND_KEYWORD_KEYS.includes(key)) continue;
      empty[key].push({
        periodDate: String(row.period_date).slice(0, 10),
        indexRatio: Number(row.index_ratio ?? 0),
      });
    }
    return empty;
  } catch {
    return empty;
  }
}

async function loadLatestMonthlyVolume(): Promise<
  Partial<Record<DemandKeywordKey, { volume: number | null; belowTen: boolean }>>
> {
  const out: Partial<Record<DemandKeywordKey, { volume: number | null; belowTen: boolean }>> = {};
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from("demand_keyword_monthly")
      .select("keyword_key, yyyymm, search_volume_month, search_volume_below_ten")
      .in("keyword_key", [...DEMAND_KEYWORD_KEYS])
      .order("yyyymm", { ascending: false })
      .limit(20);

    if (error || !data) return out;

    for (const key of DEMAND_KEYWORD_KEYS) {
      const row = data.find((r) => String(r.keyword_key) === key);
      if (!row) continue;
      out[key] = {
        volume: row.search_volume_month != null ? Number(row.search_volume_month) : null,
        belowTen: Boolean(row.search_volume_below_ten),
      };
    }
    return out;
  } catch {
    return out;
  }
}

function sliceFromDaily(
  rows: DemandKeywordDailyRow[],
  volume: { volume: number | null; belowTen: boolean } | undefined,
  fallback: DemandKeywordMetricSlice
): DemandKeywordMetricSlice {
  if (rows.length === 0) return fallback;
  return {
    searchVolumeMonth: volume?.volume ?? fallback.searchVolumeMonth,
    searchVolumeBelowTen: volume?.belowTen ?? fallback.searchVolumeBelowTen,
    indexMomPercent: momFromDaily(rows),
    indexDodPercent: dodFromDaily(rows),
  };
}

/**
 * 전국 데이터랩 일별 + 검색광고 월별 → 허브 카드·30일 검색지수 차트.
 * 구별 검색 절대값은 제공하지 않음(전국 지표를 모든 스코프에 동일 적용).
 */
export async function getDemandKeywordHubData(): Promise<DemandKeywordHubData> {
  const fallbackBundle = await getDemandNationalKeywordMetrics();
  const dailyByKey = await loadDailyByKey();
  const volumeByKey = await loadLatestMonthlyVolume();

  const hasDatalab = DEMAND_KEYWORD_KEYS.some((k) => dailyByKey[k].length > 0);
  const hasVolume = DEMAND_KEYWORD_KEYS.some((k) => volumeByKey[k] != null);

  const packing = sliceFromDaily(
    dailyByKey.packing,
    volumeByKey.packing,
    fallbackBundle.packing
  );
  const moveInClean = sliceFromDaily(
    dailyByKey.move_in_clean,
    volumeByKey.move_in_clean,
    fallbackBundle.moveInClean
  );

  return {
    source: {
      datalab: hasDatalab ? "live" : "dummy",
      volume: hasVolume ? "live" : fallbackBundle.source === "live" ? "live" : "dummy",
    },
    packing,
    moveInClean,
    dailySeries: {
      packing: toChartSeries(dailyByKey.packing),
      move_in_clean: toChartSeries(dailyByKey.move_in_clean),
    },
  };
}
