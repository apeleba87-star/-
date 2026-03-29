"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { getLast30ReportDatesKst, runJobWageDailyReportJob } from "@/lib/jobs/job-wage-daily-report";

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

/** KST 어제 포함 최근 30일 각각 스냅샷 upsert (과거 데이터 백필) */
export async function runJobWageDailyReportBackfill30Days() {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false as const, error: auth.error };

  try {
    const supabase = createServiceSupabase();
    const dates = getLast30ReportDatesKst();
    let succeeded = 0;
    const failures: { date: string; error: string }[] = [];

    for (const reportDateKst of dates) {
      const r = await runJobWageDailyReportJob(supabase, { reportDateKst });
      if (r.ok) {
        succeeded += 1;
      } else {
        failures.push({ date: reportDateKst, error: r.error ?? "unknown" });
      }
    }

    revalidatePath("/admin/job-wage-report");
    revalidatePath("/job-market-report");
    for (const d of dates) {
      revalidatePath(`/job-market-report/${d}`);
    }

    return {
      ok: true as const,
      total: dates.length,
      succeeded,
      failures,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false as const, error: message };
  }
}
