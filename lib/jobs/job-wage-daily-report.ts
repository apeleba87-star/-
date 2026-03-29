import type { SupabaseClient } from "@supabase/supabase-js";
import { getKstDayHalfOpenUtcRange, getKstTodayString, getKstYesterdayString } from "@/lib/jobs/kst-date";

export type JobWageDailyReportPayload = {
  methodologyNote: string;
  reportDateKst: string;
  window: { startUtc: string; endExclusiveUtc: string };
  /** 해당 일 신규 포지션 전체(직종 선정 전) */
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

/**
 * KST reportDate의 전일 0~24시에 생성된 포지션만 집계.
 * 1위 대분류 직종만 사용. 공고당 대표 일당 = 해당 직종 포지션의 normalized_daily_wage 최댓값.
 */
export async function runJobWageDailyReportJob(
  supabase: SupabaseClient,
  options?: { reportDateKst?: string }
): Promise<{ ok: boolean; report_date?: string; error?: string }> {
  const reportDate = options?.reportDateKst ?? getKstYesterdayString();
  const todayKst = getKstTodayString();
  if (reportDate >= todayKst) {
    return { ok: false, error: "reportDateKst must be before KST today" };
  }

  const [startUtc, endExclusiveUtc] = getKstDayHalfOpenUtcRange(reportDate);

  const { data: rawRows, error: qErr } = await supabase
    .from("job_post_positions")
    .select(
      "id, job_post_id, category_main_id, normalized_daily_wage, job_posts!inner(region)"
    )
    .gte("created_at", startUtc)
    .lt("created_at", endExclusiveUtc);

  if (qErr) {
    await supabase.from("job_wage_daily_reports").upsert(
      {
        report_date: reportDate,
        headline: "집계에 실패했습니다.",
        payload: { error: qErr.message } as Record<string, unknown>,
        fetch_error: qErr.message,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "report_date" }
    );
    return { ok: false, error: qErr.message, report_date: reportDate };
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
    "해당 기간 등록 공고 기준입니다. KST 전일 0시~24시에 새로 생성된 구인 포지션만 포함하며, 직종은 그중 등록 건수가 가장 많은 대분류 하나만 반영합니다. 현장(공고)당 대표 일당은 해당 직종 포지션의 일당 환산액 중 최댓값입니다. 시·도별 숫자는 그 대표 일당의 산술평균이며, 노출되는 극단값은 최고 일당만 표시합니다.";

  if (rows.length === 0) {
    const payload: JobWageDailyReportPayload = {
      methodologyNote,
      reportDateKst: reportDate,
      window: { startUtc, endExclusiveUtc },
      totalNewPositionCount: 0,
      dominantCategory: null,
      jobPostCount: 0,
      regions: [],
      maxDailyWage: null,
    };
    await supabase.from("job_wage_daily_reports").upsert(
      {
        report_date: reportDate,
        headline: `${reportDate} (KST)에는 등록된 신규 구인 포지션이 없습니다.`,
        payload: payload as unknown as Record<string, unknown>,
        fetch_error: null,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "report_date" }
    );
    return { ok: true, report_date: reportDate };
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
    dominantId != null
      ? { id: dominantId, name: dominantName, positionCount: dominantCount }
      : null;

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
    headline = `${reportDate} (KST) 신규 포지션에서 직종을 특정하지 못했습니다.`;
  } else if (jobPostCount === 0) {
    headline = `「${dominantCategory.name}」 신규 포지션은 있으나, 일당 환산값이 있는 공고가 없습니다.`;
  } else {
    headline = `어제 신규 구인 「${dominantCategory.name}」 기준 — 시·도별 평균 일당`;
  }

  const payload: JobWageDailyReportPayload = {
    methodologyNote,
    reportDateKst: reportDate,
    window: { startUtc, endExclusiveUtc },
    totalNewPositionCount,
    dominantCategory,
    jobPostCount,
    regions,
    maxDailyWage,
  };

  const { error: upErr } = await supabase.from("job_wage_daily_reports").upsert(
    {
      report_date: reportDate,
      headline,
      payload: payload as unknown as Record<string, unknown>,
      fetch_error: null,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "report_date" }
  );

  if (upErr) return { ok: false, error: upErr.message, report_date: reportDate };
  return { ok: true, report_date: reportDate };
}
