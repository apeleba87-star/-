"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { runJobWage30DayReportJob } from "@/lib/jobs/job-wage-daily-report";
import { getKstTodayString } from "@/lib/jobs/kst-date";

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

/** KST 어제를 말일로 하는 달력 30일 구간을 한 번에 집계해 단일 리포트로 저장 */
export async function runJobWage30DayReportManual() {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const supabase = createServiceSupabase();
    const result = await runJobWage30DayReportJob(supabase);
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

/** KST 오늘 하루(00:00~다음날 00:00 직전) 신규 포지션만 집계해 단일 리포트로 저장 */
export async function runJobWageTodayReportManual() {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const supabase = createServiceSupabase();
    const today = getKstTodayString();
    const result = await runJobWage30DayReportJob(supabase, {
      windowDays: 1,
      windowEndKst: today,
    });
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
