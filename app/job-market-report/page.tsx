import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function JobMarketReportIndexPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("job_wage_daily_reports")
    .select("report_date")
    .order("report_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.report_date) {
    redirect("/job-market-report/empty");
  }

  redirect(`/job-market-report/${data.report_date}`);
}
