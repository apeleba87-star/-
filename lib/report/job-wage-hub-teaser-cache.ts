import { unstable_cache } from "next/cache";
import type { JobWageDailyReportPayload } from "@/lib/jobs/job-wage-daily-report";
import {
  formatJobWageDominantDisplayName,
  jobWageReportListExcerptFromPayload,
} from "@/lib/jobs/job-wage-dominant-label";
import { provincesFromPayload, topProvinceFromProvinces } from "@/lib/jobs/job-wage-report-display";
/** 당일 시세 크론(4회/일) 대비 — 허브 티저 30분 캐시 */
const JOB_WAGE_HUB_REVALIDATE_SEC = 1800;
import { createClient } from "@/lib/supabase-server";
import type { JobWageHubTeaserRaw } from "@/lib/report/job-wage-hub-teaser";

function buildRawFromRow(
  reportDate: string,
  headline: string,
  payload: unknown
): JobWageHubTeaserRaw | null {
  const provinces = provincesFromPayload(payload as JobWageDailyReportPayload);
  if (!provinces.length) return null;

  const top = topProvinceFromProvinces(provinces);
  const o = payload as JobWageDailyReportPayload;
  const dominantRaw = o.dominantCategory?.name?.trim() ?? null;
  const dominantCategory = dominantRaw ? formatJobWageDominantDisplayName(dominantRaw) : null;

  return {
    reportDate,
    excerpt: jobWageReportListExcerptFromPayload(payload, headline),
    dominantCategory,
    nationalTopProvince: top?.province ?? null,
    provinces: provinces.map((p) => ({
      province: p.province,
      avgDailyWon: p.avgDailyWage,
      jobPostCount: p.jobPostCount,
    })),
  };
}

async function fetchJobWageHubTeaserRaw(): Promise<JobWageHubTeaserRaw | null> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("job_wage_daily_reports")
    .select("report_date, headline, payload")
    .order("report_date", { ascending: false })
    .limit(14);

  for (const row of rows ?? []) {
    if (!row?.report_date) continue;
    const payload = row.payload as JobWageDailyReportPayload;
    if (payload?.windowDays !== 1) continue;
    const reportDate = String(row.report_date);
    const headline = typeof row.headline === "string" ? row.headline : "";
    const built = buildRawFromRow(reportDate, headline, row.payload);
    if (built) return built;
  }
  return null;
}

/** SSR 캐시 — 30분·당일(windowDays=1) 리포트만 */
export function getCachedJobWageHubTeaserRaw() {
  return unstable_cache(
    () => fetchJobWageHubTeaserRaw(),
    ["job-wage-hub-teaser-raw-v3-daily"],
    { revalidate: JOB_WAGE_HUB_REVALIDATE_SEC, tags: ["job-wage-report"] }
  )();
}
