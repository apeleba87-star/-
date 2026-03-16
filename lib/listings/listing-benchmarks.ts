/**
 * 현장거래 시세 참고: listing_benchmarks 조회 + 구간 fallback
 * 1차 동일 구간 → 2차 시/도 → 3차 전국 카테고리 → 4차 기준 부족
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ListingBenchmarkRow = {
  metric_type: string;
  median_value: number | null;
  avg_value: number | null;
  sample_count: number;
  min_value: number | null;
  max_value: number | null;
};

export type ListingBenchmarkFallbackLevel = "exact" | "sido" | "nationwide" | "none";

export type ListingBenchmarksResult = {
  rows: ListingBenchmarkRow[];
  fallback_level: ListingBenchmarkFallbackLevel;
};

function mapRows(
  data: { metric_type: string; sample_count: number | null; median_value: unknown; avg_value: unknown; min_value: unknown; max_value: unknown }[] | null
): ListingBenchmarkRow[] {
  return (data ?? []).map((r) => ({
    metric_type: r.metric_type,
    median_value: r.median_value != null ? Number(r.median_value) : null,
    avg_value: r.avg_value != null ? Number(r.avg_value) : null,
    sample_count: r.sample_count ?? 0,
    min_value: r.min_value != null ? Number(r.min_value) : null,
    max_value: r.max_value != null ? Number(r.max_value) : null,
  }));
}

/** 시/도 추출: "인천 서구" → "인천", "서울 강남구" → "서울" */
function getSidoFromRegion(region: string): string {
  const t = region.trim().split(/\s+/)[0];
  return t ?? region.trim();
}

/**
 * 현장 한 건에 대한 시세 참고값. 중앙값 중심, fallback으로 구간 확대.
 */
export async function getListingBenchmarksForListing(
  supabase: SupabaseClient,
  params: {
    region: string;
    listing_type: string;
    category_main_id: string | null;
    category_sub_id: string | null;
  }
): Promise<ListingBenchmarksResult> {
  const { region, listing_type, category_main_id, category_sub_id } = params;
  const regionTrim = region.trim();
  if (!category_main_id || !listing_type) {
    return { rows: [], fallback_level: "none" };
  }

  const select = "metric_type, sample_count, median_value, avg_value, min_value, max_value";

  // 1차: 동일 구간 (region + listing_type + category)
  let q = supabase
    .from("listing_benchmarks")
    .select(select)
    .eq("region", regionTrim)
    .eq("listing_type", listing_type)
    .eq("category_main_id", category_main_id);
  q = category_sub_id ? q.eq("category_sub_id", category_sub_id) : q.is("category_sub_id", null);
  const { data: exactData } = await q;
  const exactRows = mapRows(exactData);
  if (exactRows.length > 0) return { rows: exactRows, fallback_level: "exact" };

  // 2차: 시/도 기준 (같은 시/도 내 동일 유형·카테고리)
  const sido = getSidoFromRegion(regionTrim);
  if (sido) {
    let qSido = supabase
      .from("listing_benchmarks")
      .select(select)
      .ilike("region", `${sido}%`)
      .eq("listing_type", listing_type)
      .eq("category_main_id", category_main_id);
    qSido = category_sub_id ? qSido.eq("category_sub_id", category_sub_id) : qSido.is("category_sub_id", null);
    const { data: sidoData } = await qSido;
    const sidoRows = mapRows(sidoData);
    if (sidoRows.length > 0) return { rows: sidoRows, fallback_level: "sido" };
  }

  // 3차: 전국 카테고리 기준 (지역 무관, metric_type당 표본 많은 것 하나씩)
  const { data: nationwideData } = await supabase
    .from("listing_benchmarks")
    .select(select)
    .eq("listing_type", listing_type)
    .eq("category_main_id", category_main_id)
    .is("category_sub_id", null);
  const nationwideAll = mapRows(nationwideData);
  const byMetric = new Map<string, ListingBenchmarkRow>();
  for (const r of nationwideAll) {
    const existing = byMetric.get(r.metric_type);
    if (!existing || r.sample_count > existing.sample_count)
      byMetric.set(r.metric_type, r);
  }
  const nationwideRows = Array.from(byMetric.values());
  if (nationwideRows.length > 0) return { rows: nationwideRows, fallback_level: "nationwide" };

  return { rows: [], fallback_level: "none" };
}

/** 중앙값 대비 편차(%) — 비율 기준, 단정 대신 참고용 문구에 사용 */
export function medianGapPercent(currentValue: number, medianValue: number | null): number | null {
  if (medianValue == null || medianValue <= 0) return null;
  const gap = ((currentValue - medianValue) / medianValue) * 100;
  return Math.round(gap * 10) / 10;
}

/** 편차 퍼센트 → "높은 편" / "유사" / "낮은 편" (등급 단정 아님) */
export function getMedianGapLabel(gapPercent: number | null): string {
  if (gapPercent == null) return "—";
  if (gapPercent >= 10) return "높은 편";
  if (gapPercent <= -10) return "낮은 편";
  return "유사";
}

export const FALLBACK_LABELS: Record<ListingBenchmarkFallbackLevel, string> = {
  exact: "동일 구간 기준",
  sido: "시·도 기준",
  nationwide: "전국 카테고리 기준",
  none: "기준 데이터 부족",
};
