import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function MarketingReportIndexPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("naver_trend_daily_reports")
    .select("report_date")
    .order("report_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.report_date) {
    redirect("/marketing-report/empty");
  }

  redirect(`/marketing-report/${data.report_date}`);
}
