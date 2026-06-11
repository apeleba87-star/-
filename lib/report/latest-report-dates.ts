import type { SupabaseClient } from "@supabase/supabase-js";

export type LatestReportDates = {
  jobWageReportDate: string | null;
  marketingReportDate: string | null;
};

/** 마케팅 리포트 최신 일자 — 일당은 `getCachedJobWageHubTeaserRaw`와 병합 */
export async function getLatestMarketingReportDate(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data } = await supabase
    .from("naver_trend_daily_reports")
    .select("report_date")
    .order("report_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.report_date as string | undefined) ?? null;
}

/** 허브·교차 링크용 최신 리포트 일자 */
export async function getLatestReportDates(
  supabase: SupabaseClient
): Promise<LatestReportDates> {
  const [{ data: jobWage }, marketingReportDate] = await Promise.all([
    supabase
      .from("job_wage_daily_reports")
      .select("report_date")
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getLatestMarketingReportDate(supabase),
  ]);

  return {
    jobWageReportDate: (jobWage?.report_date as string | undefined) ?? null,
    marketingReportDate,
  };
}

export function formatReportLinkDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일`;
}
