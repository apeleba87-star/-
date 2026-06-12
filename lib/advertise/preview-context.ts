import { createClient } from "@/lib/supabase-server";
import { getLatestReportDates } from "@/lib/report/latest-report-dates";
import type { RadarAdInquiryPreviewContext } from "@/lib/demand/radar-ad-inquiry-live-preview";
import { filterOpenPublicJobs } from "@/lib/jobs-public/filter-open-jobs";

export async function getRadarAdInquiryPreviewContext(): Promise<RadarAdInquiryPreviewContext> {
  const supabase = createClient();
  const [{ data: jobRow }, dates] = await Promise.all([
    supabase.from("public_job_openings").select("id, closing_at").limit(40),
    getLatestReportDates(supabase),
  ]);

  const openJobs = filterOpenPublicJobs(jobRow ?? []);
  const sampleJobId = openJobs[0]?.id ?? jobRow?.[0]?.id ?? null;

  return {
    sampleJobId,
    jobWageReportDate: dates.jobWageReportDate,
  };
}
