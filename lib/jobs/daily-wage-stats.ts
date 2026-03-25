import type { SupabaseClient } from "@supabase/supabase-js";

type WageRow = { pay_amount: number | string | null; normalized_daily_wage: number | string | null };

function toPositiveNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * 인력구인 상단 평균용 표본:
 * 1) completed_job_assignments (매칭 완료)
 * 2) 관리자 엑셀 대량 업로드(외부 퍼옴) 포지션
 */
export async function getJobsHeadlineDailyWageStats(supabase: SupabaseClient): Promise<{
  avgDailyWage: number | null;
  sampleCount: number;
}> {
  const [completedRes, excelRes] = await Promise.all([
    supabase
      .from("completed_job_assignments")
      .select("pay_amount, normalized_daily_wage")
      .eq("pay_unit", "day"),
    supabase
      .from("job_post_positions")
      .select("pay_amount, normalized_daily_wage, job_posts!inner(is_external)")
      .eq("pay_unit", "day")
      .eq("job_type_input", "엑셀 대량")
      .eq("job_posts.is_external", true),
  ]);

  const completed = (completedRes.data ?? []) as WageRow[];
  const excel = (excelRes.data ?? []) as WageRow[];

  const samples: number[] = [];
  for (const r of completed) {
    const n = toPositiveNumber(r.normalized_daily_wage) ?? toPositiveNumber(r.pay_amount);
    if (n != null) samples.push(n);
  }
  for (const r of excel) {
    const n = toPositiveNumber(r.normalized_daily_wage) ?? toPositiveNumber(r.pay_amount);
    if (n != null) samples.push(n);
  }

  if (samples.length === 0) return { avgDailyWage: null, sampleCount: 0 };
  const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  return { avgDailyWage: avg, sampleCount: samples.length };
}

