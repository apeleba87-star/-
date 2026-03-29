"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { runJobWageDailyReportJob } from "@/lib/jobs/job-wage-daily-report";

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인 필요" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, error: "권한 없음" };
  }
  return { ok: true as const };
}

/** KST 전일 신규 포지션 기준 일당 스냅샷 (Cron 없이 수동 실행) */
export async function runJobWageDailyReportManual() {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const supabase = createServiceSupabase();
    const result = await runJobWageDailyReportJob(supabase);
    revalidatePath("/admin/job-wage-report");
    revalidatePath("/job-market-report");
    if (result.report_date) {
      revalidatePath(`/job-market-report/${result.report_date}`);
    }
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
