import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToDateString, getKstRollingWindowHalfOpenUtcRange, getKstTodayString, getKstYesterdayString } from "@/lib/jobs/kst-date";

/** 집계에 쓰는 KST 달력일 수(포함) */
export const JOB_WAGE_REPORT_WINDOW_DAYS = 30;

export type JobWageDailyReportPayload = {
  methodologyNote: string;
  /** 집계 구간의 마지막 날(KST 달력일, 포함) */
  reportDateKst: string;
  /** 집계 구간의 첫 날(KST 달력일, 포함) */
  windowStartKst: string;
  windowDays: number;
  window: { startUtc: string; endExclusiveUtc: string };
  /** 구간 내 신규 포지션 전체(직종 선정 전) */
  totalNewPositionCount: number;
  dominantCategory: { id: string; name: string; positionCount: number } | null;
  /** 1위 직종만 남긴 뒤, 일당이 유효한 공고 수 */
  jobPostCount: number;
  regions: { region: string; avgDailyWage: number; jobPostCount: number }[];
  maxDailyWage: { amount: number; region: string } | null;
};

type PositionRow = {
  id: string;
  job_post_id: string;
  category_main_id: string | null;
  normalized_daily_wage: number | string | null;
};

async function replaceJobWageReportsWithSingleRow(
  supabase: SupabaseClient,
  row: {
    report_date: string;
    headline: string;
    payload: Record<string, unknown>;
    fetch_error: string | null;
    computed_at: string;
  }
): Promise<{ error: Error | null }> {
  const { error: delErr } = await supabase.from("job_wage_daily_reports").delete().not("report_date", "is", null);
  if (delErr) return { error: new Error(delErr.message) };
  const { error: insErr } = await supabase.from("job_wage_daily_reports").insert(row);
  if (insErr) return { error: new Error(insErr.message) };
  return { error: null };
}

/**
 * KST 기준 [windowEnd - 29일, windowEnd] 달력 30일 동안 생성된 포지션을 한 번에 집계.
 * 1위 대분류 직종만 사용. 공고당 대표 일당 = 해당 직종 포지션의 normalized_daily_wage 최댓값.
 * 저장 시 기존 job_wage_daily_reports 행을 모두 지운 뒤 1건만 둡니다(report_date = 구간 말일).
 */
export async function runJobWage30DayReportJob(
  supabase: SupabaseClient,
  options?: { windowEndKst?: string; /** @deprecated */ reportDateKst?: string }
): Promise<{ ok: boolean; report_date?: string; error?: string }> {
  const windowEnd = options?.windowEndKst ?? options?.reportDateKst ?? getKstYesterdayString();
  const todayKst = getKstTodayString();
  if (windowEnd >= todayKst) {
    return { ok: false, error: "windowEndKst must be before KST today" };
  }

  const windowStartKst = addDaysToDateString(windowEnd, -(JOB_WAGE_REPORT_WINDOW_DAYS - 1));
  const [startUtc, endExclusiveUtc] = getKstRollingWindowHalfOpenUtcRange(windowEnd, JOB_WAGE_REPORT_WINDOW_DAYS);

  const { data: rawRows, error: qErr } = await supabase
    .from("job_post_positions")
    .select("id, job_post_id, category_main_id, normalized_daily_wage, job_posts!inner(region)")
    .gte("created_at", startUtc)
    .lt("created_at", endExclusiveUtc);

  if (qErr) {
    const { error: upErr } = await replaceJobWageReportsWithSingleRow(supabase, {
      report_date: windowEnd,
      headline: "집계에 실패했습니다.",
      payload: { error: qErr.message } as Record<string, unknown>,
      fetch_error: qErr.message,
      computed_at: new Date().toISOString(),
    });
    if (upErr) return { ok: false, error: upErr.message, report_date: windowEnd };
    return { ok: false, error: qErr.message, report_date: windowEnd };
  }

  const rows = (rawRows ?? []) as unknown as PositionRow[];
  const totalNewPositionCount = rows.length;

  const postIds = [...new Set(rows.map((r) => r.job_post_id).filter(Boolean))];
  const regionByPostId = new Map<string, string>();
  const chunk = 200;
  for (let i = 0; i < postIds.length; i += chunk) {
    const slice = postIds.slice(i, i + chunk);
    const { data: posts } = await supabase.from("job_posts").select("id, region").in("id", slice);
    for (const p of posts ?? []) {
      const id = p.id as string;
      const reg = String((p as { region?: string }).region ?? "").trim();
      regionByPostId.set(id, reg || "미입력");
    }
  }

  function regionFromRow(r: PositionRow): string {
    return regionByPostId.get(r.job_post_id) ?? "미입력";
  }

  const methodologyNote =
    `KST 달력 ${windowStartKst} ~ ${windowEnd} (${JOB_WAGE_REPORT_WINDOW_DAYS}일) 동안 새로 생성된 구인 포지션만 포함합니다. 그중 등록 건수가 가장 많은 대분류 직종 하나만 반영하며, 현장(공고)당 대표 일당은 해당 직종 포지션의 일당 환산액 중 최댓값입니다. 시·도별 숫자는 그 대표 일당의 산술평균이며, 노출되는 극단값은 최고 일당만 표시합니다.`;

  if (rows.length === 0) {
    const payload: JobWageDailyReportPayload = {
      methodologyNote,
      reportDateKst: windowEnd,
      windowStartKst,
      windowDays: JOB_WAGE_REPORT_WINDOW_DAYS,
      window: { startUtc, endExclusiveUtc },
      totalNewPositionCount: 0,
      dominantCategory: null,
      jobPostCount: 0,
      regions: [],
      maxDailyWage: null,
    };
    const { error: upErr } = await replaceJobWageReportsWithSingleRow(supabase, {
      report_date: windowEnd,
      headline: `${windowStartKst} ~ ${windowEnd} (KST) 구간에 등록된 신규 구인 포지션이 없습니다.`,
      payload: payload as unknown as Record<string, unknown>,
      fetch_error: null,
      computed_at: new Date().toISOString(),
    });
    if (upErr) return { ok: false, error: upErr.message, report_date: windowEnd };
    return { ok: true, report_date: windowEnd };
  }

  const catCounts = new Map<string, number>();
  for (const r of rows) {
    const id = r.category_main_id;
    if (!id) continue;
    catCounts.set(id, (catCounts.get(id) ?? 0) + 1);
  }

  const sortedCats = [...catCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const dominantEntry = sortedCats[0];
  const dominantId = dominantEntry ? dominantEntry[0] : null;
  const dominantCount = dominantEntry ? dominantEntry[1] : 0;

  let dominantName = "알 수 없음";
  if (dominantId) {
    const { data: cat } = await supabase.from("categories").select("name").eq("id", dominantId).maybeSingle();
    if (cat?.name) dominantName = cat.name as string;
  }

  const dominantCategory =
    dominantId != null ? { id: dominantId, name: dominantName, positionCount: dominantCount } : null;

  const filtered = dominantId ? rows.filter((r) => r.category_main_id === dominantId) : [];

  const byJob = new Map<string, { wage: number; region: string }>();
  for (const r of filtered) {
    const w = Number(r.normalized_daily_wage);
    if (!Number.isFinite(w) || w <= 0) continue;
    const region = regionFromRow(r);
    const prev = byJob.get(r.job_post_id);
    if (!prev || w > prev.wage) {
      byJob.set(r.job_post_id, { wage: w, region });
    }
  }

  const byRegion = new Map<string, { sum: number; count: number }>();
  let maxAmount = -Infinity;
  let maxRegion = "";

  for (const { wage, region } of byJob.values()) {
    const agg = byRegion.get(region) ?? { sum: 0, count: 0 };
    agg.sum += wage;
    agg.count += 1;
    byRegion.set(region, agg);
    if (wage > maxAmount) {
      maxAmount = wage;
      maxRegion = region;
    }
  }

  const regions = [...byRegion.entries()]
    .map(([region, { sum, count }]) => ({
      region,
      avgDailyWage: Math.round(sum / count),
      jobPostCount: count,
    }))
    .sort((a, b) => a.region.localeCompare(b.region, "ko"));

  const maxDailyWage =
    maxAmount > 0 && Number.isFinite(maxAmount) ? { amount: Math.round(maxAmount), region: maxRegion } : null;

  const jobPostCount = byJob.size;

  let headline: string;
  if (!dominantCategory) {
    headline = `${windowStartKst}~${windowEnd} 신규 포지션에서 직종을 특정하지 못했습니다.`;
  } else if (jobPostCount === 0) {
    headline = `「${dominantCategory.name}」 신규 포지션은 있으나, 일당 환산값이 있는 공고가 없습니다. (${JOB_WAGE_REPORT_WINDOW_DAYS}일 구간)`;
  } else {
    headline = `최근 ${JOB_WAGE_REPORT_WINDOW_DAYS}일(KST) 신규 구인 「${dominantCategory.name}」 기준 — 시·도별 평균 일당 (${windowStartKst}~${windowEnd})`;
  }

  const payload: JobWageDailyReportPayload = {
    methodologyNote,
    reportDateKst: windowEnd,
    windowStartKst,
    windowDays: JOB_WAGE_REPORT_WINDOW_DAYS,
    window: { startUtc, endExclusiveUtc },
    totalNewPositionCount,
    dominantCategory,
    jobPostCount,
    regions,
    maxDailyWage,
  };

  const { error: upErr } = await replaceJobWageReportsWithSingleRow(supabase, {
    report_date: windowEnd,
    headline,
    payload: payload as unknown as Record<string, unknown>,
    fetch_error: null,
    computed_at: new Date().toISOString(),
  });

  if (upErr) return { ok: false, error: upErr.message, report_date: windowEnd };
  return { ok: true, report_date: windowEnd };
}

/** 크론·기존 호출 호환용 별칭 */
export const runJobWageDailyReportJob = runJobWage30DayReportJob;
