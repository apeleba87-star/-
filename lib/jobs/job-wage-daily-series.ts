import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobWageDailyReportPayload } from "@/lib/jobs/job-wage-daily-report";
import { weightedMeanDailyWage } from "@/lib/jobs/job-wage-premium-insights";
import { provincesFromPayload } from "@/lib/jobs/job-wage-report-display";

export type JobWageNationalMetricRow = {
  report_date: string;
  window_days: number;
  dominant_category_key: string | null;
  dominant_category_name: string | null;
  dominant_position_count: number;
  total_new_position_count: number;
  job_post_count: number;
  national_weighted_avg_wage: number | null;
  top_province: string | null;
  top_province_avg_wage: number | null;
  bottom_province: string | null;
  bottom_province_avg_wage: number | null;
  computed_at: string;
};

export type JobWageProvinceMetricRow = {
  report_date: string;
  province: string;
  avg_daily_wage: number;
  job_post_count: number;
};

export type JobWageNationalSeriesPoint = {
  reportDate: string;
  nationalWeightedAvgWon: number | null;
  jobPostCount: number;
  dominantCategoryName: string | null;
};

export type JobWageProvinceSeriesPoint = {
  reportDate: string;
  avgDailyWon: number;
  jobPostCount: number;
};

/** 당일 리포트만 시계열 테이블에 반영 */
export async function syncJobWageDailySeries(
  supabase: SupabaseClient,
  reportDate: string,
  payload: JobWageDailyReportPayload
): Promise<{ ok: boolean; error?: string }> {
  if (payload.windowDays !== 1) {
    return { ok: true };
  }

  const provinces = provincesFromPayload(payload);
  const withData = provinces.filter((p) => p.jobPostCount > 0);
  const top = payload.topProvinceByAvgWage ?? withData[0] ?? null;
  const bottom =
    payload.bottomProvinceByAvgWage ??
    (withData.length >= 2 ? withData[withData.length - 1]! : null);

  const nationalRow = {
    report_date: reportDate,
    window_days: 1,
    dominant_category_key: payload.dominantCategory?.id ?? null,
    dominant_category_name: payload.dominantCategory?.name ?? null,
    dominant_position_count: payload.dominantCategory?.positionCount ?? 0,
    total_new_position_count: payload.totalNewPositionCount,
    job_post_count: payload.jobPostCount,
    national_weighted_avg_wage: weightedMeanDailyWage(provinces),
    top_province: top?.province ?? null,
    top_province_avg_wage: top?.avgDailyWage ?? null,
    bottom_province: bottom?.province ?? null,
    bottom_province_avg_wage: bottom?.avgDailyWage ?? null,
    computed_at: new Date().toISOString(),
  };

  const { error: nationalErr } = await supabase
    .from("job_wage_daily_national_metrics")
    .upsert(nationalRow, { onConflict: "report_date" });

  if (nationalErr) {
    return { ok: false, error: nationalErr.message };
  }

  const { error: deleteErr } = await supabase
    .from("job_wage_daily_province_metrics")
    .delete()
    .eq("report_date", reportDate);

  if (deleteErr) {
    return { ok: false, error: deleteErr.message };
  }

  if (withData.length > 0) {
    const provinceRows: JobWageProvinceMetricRow[] = withData.map((p) => ({
      report_date: reportDate,
      province: p.province,
      avg_daily_wage: p.avgDailyWage,
      job_post_count: p.jobPostCount,
    }));

    const { error: provinceErr } = await supabase
      .from("job_wage_daily_province_metrics")
      .insert(provinceRows);

    if (provinceErr) {
      return { ok: false, error: provinceErr.message };
    }
  }

  return { ok: true };
}

/** payload 원본에서 당일 시계열 동기화 (백필·관리용) */
export async function syncJobWageDailySeriesFromPayload(
  supabase: SupabaseClient,
  reportDate: string,
  payload: unknown
): Promise<{ ok: boolean; error?: string }> {
  const p = payload as JobWageDailyReportPayload;
  if (typeof p?.windowDays !== "number" || p.windowDays !== 1) {
    return { ok: true };
  }
  return syncJobWageDailySeries(supabase, reportDate, p);
}

/** 전국 당일 시계열 — 차트·기간 비교용 */
export async function fetchJobWageNationalDailySeries(
  supabase: SupabaseClient,
  options?: { fromDate?: string; toDate?: string; limit?: number }
): Promise<JobWageNationalSeriesPoint[]> {
  let q = supabase
    .from("job_wage_daily_national_metrics")
    .select(
      "report_date, national_weighted_avg_wage, job_post_count, dominant_category_name"
    )
    .order("report_date", { ascending: true });

  if (options?.fromDate) q = q.gte("report_date", options.fromDate);
  if (options?.toDate) q = q.lte("report_date", options.toDate);
  if (options?.limit) q = q.limit(options.limit);

  const { data, error } = await q;
  if (error || !data) return [];

  return data.map((row) => ({
    reportDate: String(row.report_date),
    nationalWeightedAvgWon:
      typeof row.national_weighted_avg_wage === "number" ? row.national_weighted_avg_wage : null,
    jobPostCount: Number(row.job_post_count) || 0,
    dominantCategoryName:
      typeof row.dominant_category_name === "string" ? row.dominant_category_name : null,
  }));
}

/** 시·도 당일 시계열 */
export async function fetchJobWageProvinceDailySeries(
  supabase: SupabaseClient,
  province: string,
  options?: { fromDate?: string; toDate?: string; limit?: number }
): Promise<JobWageProvinceSeriesPoint[]> {
  let q = supabase
    .from("job_wage_daily_province_metrics")
    .select("report_date, avg_daily_wage, job_post_count")
    .eq("province", province)
    .order("report_date", { ascending: true });

  if (options?.fromDate) q = q.gte("report_date", options.fromDate);
  if (options?.toDate) q = q.lte("report_date", options.toDate);
  if (options?.limit) q = q.limit(options.limit);

  const { data, error } = await q;
  if (error || !data) return [];

  return data.map((row) => ({
    reportDate: String(row.report_date),
    avgDailyWon: Number(row.avg_daily_wage) || 0,
    jobPostCount: Number(row.job_post_count) || 0,
  }));
}

/** 기간 내 전국 가중 평균의 산술평균(일별 대표값 기준) — 추후 UI용 */
export function meanOfNationalSeries(points: JobWageNationalSeriesPoint[]): number | null {
  const vals = points
    .map((p) => p.nationalWeightedAvgWon)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** 기간 내 시·도 일당 산술평균(일별 시·도 평균의 평균) */
export function meanOfProvinceSeries(points: JobWageProvinceSeriesPoint[]): number | null {
  const vals = points.map((p) => p.avgDailyWon).filter((v) => Number.isFinite(v) && v > 0);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** 여러 시·도 기간 평균 한 번에 */
export async function fetchJobWageProvincePeriodMeans(
  supabase: SupabaseClient,
  provinces: string[],
  fromDate: string,
  toDate: string
): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  await Promise.all(
    provinces.map(async (province) => {
      const series = await fetchJobWageProvinceDailySeries(supabase, province, {
        fromDate,
        toDate,
      });
      out[province] = meanOfProvinceSeries(series);
    })
  );
  return out;
}
