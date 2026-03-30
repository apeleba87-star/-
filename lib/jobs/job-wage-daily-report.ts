import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalSidoFromRegion } from "@/lib/listings/regions";
import { addDaysToDateString, getKstRollingWindowHalfOpenUtcRange, getKstTodayString, getKstYesterdayString } from "@/lib/jobs/kst-date";

/** 집계에 쓰는 KST 달력일 수(포함) */
export const JOB_WAGE_REPORT_WINDOW_DAYS = 30;

/** 지도·요약에 쓰는 평균 일당 상위 시·도 개수 */
export const JOB_WAGE_MAP_TOP_PROVINCES = 5;

export type JobWageProvinceRow = {
  province: string;
  avgDailyWage: number;
  jobPostCount: number;
};

export type JobWageDailyReportPayload = {
  methodologyNote: string;
  reportDateKst: string;
  windowStartKst: string;
  windowDays: number;
  window: { startUtc: string; endExclusiveUtc: string };
  totalNewPositionCount: number;
  dominantCategory: { id: string; name: string; positionCount: number } | null;
  jobPostCount: number;
  /** 시·도 단위 평균(공고당 대표 일당의 산술평균). 표는 보통 평균 높은 순 */
  provinces: JobWageProvinceRow[];
  /** 평균 일당 기준 상위 시·도(지도 강조용) */
  mapTopProvincesByAvg: JobWageProvinceRow[];
  /** 평균 일당이 가장 높은 시·도 */
  topProvinceByAvgWage: JobWageProvinceRow | null;
  /** 공고 1건 기준 대표 일당 최고(시·군·구 원문) */
  maxDailyWage: { amount: number; region: string } | null;
  /** 공고 1건 기준 대표 일당 최저(시·군·구 원문) */
  minDailyWage: { amount: number; region: string } | null;
  /**
   * @deprecated 구 스냅샷. `provinces`가 없을 때 UI에서 시·도만 추출해 사용.
   */
  regions?: { region: string; avgDailyWage: number; jobPostCount: number }[];
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
    `KST 달력 ${windowStartKst} ~ ${windowEnd} (${JOB_WAGE_REPORT_WINDOW_DAYS}일) 동안 새로 생긴 구인 포지션만 봅니다. 그중 가장 많이 등록된 대분류 직종 하나만 골라, 공고(현장)마다 그 직종 일당 환산액 중 가장 큰 값만 대표 일당으로 씁니다. 시·도(서울·경기·충남 등)는 그 대표 일당을 다시 모아 산술평균을 냅니다. 최고·최저는 그 대표 일당이 가장 크거나 작았던 시·군·구(공고에 적힌 지역) 한 곳입니다.`;

  const emptyPayload = (extra: Partial<JobWageDailyReportPayload> = {}): JobWageDailyReportPayload => ({
    methodologyNote,
    reportDateKst: windowEnd,
    windowStartKst,
    windowDays: JOB_WAGE_REPORT_WINDOW_DAYS,
    window: { startUtc, endExclusiveUtc },
    totalNewPositionCount: 0,
    dominantCategory: null,
    jobPostCount: 0,
    provinces: [],
    mapTopProvincesByAvg: [],
    topProvinceByAvgWage: null,
    maxDailyWage: null,
    minDailyWage: null,
    ...extra,
  });

  if (rows.length === 0) {
    const payload = emptyPayload();
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

  const byProvince = new Map<string, { sum: number; count: number }>();
  let maxAmount = -Infinity;
  let maxRegion = "";
  let minAmount = Infinity;
  let minRegion = "";

  for (const { wage, region } of byJob.values()) {
    const sido = canonicalSidoFromRegion(region);
    const key = sido;
    const agg = byProvince.get(key) ?? { sum: 0, count: 0 };
    agg.sum += wage;
    agg.count += 1;
    byProvince.set(key, agg);

    if (wage > maxAmount) {
      maxAmount = wage;
      maxRegion = region;
    }
    if (wage < minAmount) {
      minAmount = wage;
      minRegion = region;
    }
  }

  const provinces: JobWageProvinceRow[] = [...byProvince.entries()]
    .map(([province, { sum, count }]) => ({
      province,
      avgDailyWage: Math.round(sum / count),
      jobPostCount: count,
    }))
    .sort((a, b) => b.avgDailyWage - a.avgDailyWage || a.province.localeCompare(b.province, "ko"));

  const mapTopProvincesByAvg = provinces.filter((p) => p.jobPostCount > 0).slice(0, JOB_WAGE_MAP_TOP_PROVINCES);

  const topProvinceByAvgWage = mapTopProvincesByAvg[0] ?? null;

  const maxDailyWage =
    maxAmount > 0 && Number.isFinite(maxAmount) ? { amount: Math.round(maxAmount), region: maxRegion } : null;
  const minDailyWage =
    minAmount < Infinity && Number.isFinite(minAmount) ? { amount: Math.round(minAmount), region: minRegion } : null;

  const jobPostCount = byJob.size;

  let headline: string;
  if (!dominantCategory) {
    headline = `${windowStartKst}~${windowEnd} 신규 포지션에서 직종을 특정하지 못했습니다.`;
  } else if (jobPostCount === 0) {
    headline = `「${dominantCategory.name}」 신규 포지션은 있으나, 일당 환산값이 있는 공고가 없습니다. (${JOB_WAGE_REPORT_WINDOW_DAYS}일 구간)`;
  } else {
    headline = `최근 ${JOB_WAGE_REPORT_WINDOW_DAYS}일 「${dominantCategory.name}」 신규 구인 — 시·도별 평균 일당 (${windowStartKst}~${windowEnd})`;
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
    provinces,
    mapTopProvincesByAvg,
    topProvinceByAvgWage,
    maxDailyWage,
    minDailyWage,
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
