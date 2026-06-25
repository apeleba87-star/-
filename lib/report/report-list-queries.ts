import type { SupabaseClient } from "@supabase/supabase-js";
import { reportListRange } from "@/lib/report/report-list-pagination";

export async function countAwardReportPosts(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .not("published_at", "is", null)
    .eq("is_private", false)
    .eq("source_type", "award_market_intel");
  return count ?? 0;
}

export async function countTenderDailyReportPosts(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .not("published_at", "is", null)
    .eq("is_private", false)
    .or("source_type.eq.auto_tender_daily,slug.ilike.*daily-tender-digest*");
  return count ?? 0;
}

export async function countMoveBlogPosts(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .not("published_at", "is", null)
    .eq("is_private", false)
    .eq("source_type", "move_rtms_seo");
  return count ?? 0;
}

export async function fetchReportPostsPage(
  supabase: SupabaseClient,
  opts: { isAward: boolean; page: number },
) {
  const { from, to } = reportListRange(opts.page);
  const base = opts.isAward
    ? supabase
        .from("posts")
        .select("id, title, excerpt, published_at, slug, source_type, source_ref, report_snapshot")
        .not("published_at", "is", null)
        .eq("is_private", false)
        .eq("source_type", "award_market_intel")
    : supabase
        .from("posts")
        .select("id, title, excerpt, published_at, slug, source_type, source_ref")
        .not("published_at", "is", null)
        .eq("is_private", false)
        .or("source_type.eq.auto_tender_daily,slug.ilike.*daily-tender-digest*");

  return base.order("published_at", { ascending: false }).range(from, to);
}

export async function fetchMoveBlogPostsPage(supabase: SupabaseClient, page: number) {
  const { from, to } = reportListRange(page);
  return supabase
    .from("posts")
    .select("id, title, excerpt, published_at, slug, source_type, source_ref")
    .not("published_at", "is", null)
    .eq("is_private", false)
    .eq("source_type", "move_rtms_seo")
    .order("published_at", { ascending: false })
    .range(from, to);
}

export async function countPrivatePosts(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .not("published_at", "is", null)
    .eq("is_private", true);
  return count ?? 0;
}

export async function fetchPrivatePostsPage(supabase: SupabaseClient, page: number) {
  const { from, to } = reportListRange(page);
  return supabase
    .from("posts")
    .select("id, title, excerpt, published_at, slug, source_type, source_ref")
    .not("published_at", "is", null)
    .eq("is_private", true)
    .order("published_at", { ascending: false })
    .range(from, to);
}

export async function countIndustryPosts(supabase: SupabaseClient, categoryId: string): Promise<number> {
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .not("published_at", "is", null)
    .eq("category_id", categoryId)
    .eq("is_private", false);
  return count ?? 0;
}

export async function fetchIndustryPostsPage(supabase: SupabaseClient, categoryId: string, page: number) {
  const { from, to } = reportListRange(page);
  return supabase
    .from("posts")
    .select("id, title, excerpt, published_at, slug")
    .not("published_at", "is", null)
    .eq("category_id", categoryId)
    .eq("is_private", false)
    .order("published_at", { ascending: false })
    .range(from, to);
}

export async function countJobWageReports(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("job_wage_daily_reports")
    .select("report_date", { count: "exact", head: true });
  return count ?? 0;
}

export async function fetchJobWageReportsPage(supabase: SupabaseClient, page: number) {
  const { from, to } = reportListRange(page);
  return supabase
    .from("job_wage_daily_reports")
    .select("report_date, headline, payload")
    .order("report_date", { ascending: false })
    .range(from, to);
}

export async function countMarketingReports(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("naver_trend_daily_reports")
    .select("report_date", { count: "exact", head: true });
  return count ?? 0;
}

export async function fetchMarketingReportsPage(supabase: SupabaseClient, page: number) {
  const { from, to } = reportListRange(page);
  return supabase
    .from("naver_trend_daily_reports")
    .select("report_date, headline, payload")
    .order("report_date", { ascending: false })
    .range(from, to);
}
