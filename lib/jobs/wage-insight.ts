import type { SupabaseClient } from "@supabase/supabase-js";
import { JOB_TYPE_PRESETS } from "@/lib/jobs/job-type-presets";

type WageSampleRow = {
  region: string;
  skill_level: string | null;
  pay_amount: number | string | null;
  normalized_daily_wage: number | string | null;
};

type Bucket = "region_skill" | "region" | "nation_skill" | "nation";

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function bucketLabel(b: Bucket): string {
  switch (b) {
    case "region_skill":
      return "지역·숙련도";
    case "region":
      return "지역";
    case "nation_skill":
      return "전국·숙련도";
    default:
      return "전국";
  }
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function percentileRank(sorted: number[], value: number): number {
  if (sorted.length === 0) return 0;
  let lessOrEqual = 0;
  for (const v of sorted) {
    if (v <= value) lessOrEqual += 1;
  }
  return Math.round((lessOrEqual / sorted.length) * 100);
}

function confidenceLabel(sampleCount: number): "표본 적음" | "표본 보통" | "표본 충분" {
  if (sampleCount >= 30) return "표본 충분";
  if (sampleCount >= 10) return "표본 보통";
  return "표본 적음";
}

export type FreeInsight = {
  avg: number | null;
  sampleCount: number;
  sampleLabel: string;
};

export type DetailedInsight = {
  avg: number | null;
  sampleCount: number;
  sampleBasis: string;
  recommendedMin: number | null;
  recommendedMax: number | null;
  deltaPercent: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  percentile: number | null;
  riskLabel: string;
  confidenceLabel: "표본 적음" | "표본 보통" | "표본 충분";
};

async function fetchSamples(
  supabase: SupabaseClient,
  categorySubId: string
): Promise<WageSampleRow[]> {
  const [completedRes, excelRes] = await Promise.all([
    supabase
      .from("completed_job_assignments")
      .select("region, skill_level, pay_amount, normalized_daily_wage")
      .eq("pay_unit", "day")
      .eq("category_sub_id", categorySubId)
      .order("completed_at", { ascending: false })
      .limit(500),
    supabase
      .from("job_post_positions")
      .select("skill_level, pay_amount, normalized_daily_wage, job_posts!inner(region, is_external)")
      .eq("pay_unit", "day")
      .eq("category_sub_id", categorySubId)
      .eq("job_posts.is_external", true)
      .eq("job_type_input", "엑셀 대량")
      .limit(500),
  ]);

  const completed = (completedRes.data ?? []) as {
    region: string;
    skill_level: string | null;
    pay_amount: number | string | null;
    normalized_daily_wage: number | string | null;
  }[];
  const excelRaw = (excelRes.data ?? []) as {
    skill_level: string | null;
    pay_amount: number | string | null;
    normalized_daily_wage: number | string | null;
    job_posts: { region: string; is_external: boolean } | { region: string; is_external: boolean }[];
  }[];

  const excel: WageSampleRow[] = excelRaw.map((r) => {
    const jp = Array.isArray(r.job_posts) ? r.job_posts[0] : r.job_posts;
    return {
      region: jp?.region ?? "",
      skill_level: r.skill_level ?? null,
      pay_amount: r.pay_amount,
      normalized_daily_wage: r.normalized_daily_wage,
    };
  });

  return [...completed, ...excel];
}

function extractWages(rows: WageSampleRow[]): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const n = toNumber(r.normalized_daily_wage) ?? toNumber(r.pay_amount);
    if (n != null) out.push(n);
  }
  return out;
}

export async function getFreeWageInsightByJobTypeKey(
  supabase: SupabaseClient,
  jobTypeKey: string
): Promise<FreeInsight> {
  const preset = JOB_TYPE_PRESETS.find((p) => p.key === jobTypeKey);
  if (!preset) return { avg: null, sampleCount: 0, sampleLabel: "표본 없음" };

  const { data: sub } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", preset.subSlug)
    .eq("is_active", true)
    .in("usage", ["job", "default"])
    .limit(1)
    .maybeSingle();

  if (!sub?.id) return { avg: null, sampleCount: 0, sampleLabel: "표본 없음" };

  const samples = await fetchSamples(supabase, sub.id);
  const wages = extractWages(samples);
  if (wages.length === 0) return { avg: null, sampleCount: 0, sampleLabel: "표본 없음" };
  const sorted = [...wages].sort((a, b) => a - b);
  // 무료 노출 기준값은 이상치 영향이 적은 중앙값(p50)을 사용한다.
  const avg = Math.round(quantile(sorted, 0.5));
  const conf = confidenceLabel(wages.length);
  const label = conf === "표본 충분" ? `표본 ${wages.length}건 (신뢰도 높음)` : `표본 ${wages.length}건 (참고용)`;
  return { avg, sampleCount: wages.length, sampleLabel: label };
}

export async function getDetailedWageInsightByJobTypeKey(params: {
  supabase: SupabaseClient;
  jobTypeKey: string;
  region: string;
  skillLevel: "expert" | "general";
  currentPayAmount: number;
}): Promise<DetailedInsight> {
  const { supabase, jobTypeKey, region, skillLevel, currentPayAmount } = params;
  const preset = JOB_TYPE_PRESETS.find((p) => p.key === jobTypeKey);
  if (!preset) {
    return {
      avg: null,
      sampleCount: 0,
      sampleBasis: "표본 없음",
      recommendedMin: null,
      recommendedMax: null,
      deltaPercent: null,
      p25: null,
      p50: null,
      p75: null,
      percentile: null,
      riskLabel: "표본이 부족합니다.",
      confidenceLabel: "표본 적음",
    };
  }

  const { data: sub } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", preset.subSlug)
    .eq("is_active", true)
    .in("usage", ["job", "default"])
    .limit(1)
    .maybeSingle();
  if (!sub?.id) {
    return {
      avg: null,
      sampleCount: 0,
      sampleBasis: "표본 없음",
      recommendedMin: null,
      recommendedMax: null,
      deltaPercent: null,
      p25: null,
      p50: null,
      p75: null,
      percentile: null,
      riskLabel: "표본이 부족합니다.",
      confidenceLabel: "표본 적음",
    };
  }

  const samples = await fetchSamples(supabase, sub.id);
  const byBucket = (bucket: Bucket) =>
    samples.filter((s) => {
      const sameRegion = s.region.trim() === region.trim();
      const sameSkill = (s.skill_level ?? "general") === skillLevel;
      if (bucket === "region_skill") return sameRegion && sameSkill;
      if (bucket === "region") return sameRegion;
      if (bucket === "nation_skill") return sameSkill;
      return true;
    });
  const order: Array<{ key: Bucket; min: number }> = [
    { key: "region_skill", min: 10 },
    { key: "region", min: 15 },
    { key: "nation_skill", min: 20 },
    { key: "nation", min: 25 },
  ];
  let chosen: Bucket = "nation";
  let chosenRows: WageSampleRow[] = [];
  for (const b of order) {
    const rows = byBucket(b.key);
    if (rows.length >= b.min) {
      chosen = b.key;
      chosenRows = rows;
      break;
    }
    if (chosenRows.length === 0 && rows.length > 0) {
      // 최소 표본에 못 미치더라도, 가능한 가장 구체적인 버킷을 우선 보관.
      chosen = b.key;
      chosenRows = rows;
    }
  }

  const wages = extractWages(chosenRows);
  if (wages.length === 0) {
    return {
      avg: null,
      sampleCount: 0,
      sampleBasis: "표본 없음",
      recommendedMin: null,
      recommendedMax: null,
      deltaPercent: null,
      p25: null,
      p50: null,
      p75: null,
      percentile: null,
      riskLabel: "표본이 부족합니다.",
      confidenceLabel: "표본 적음",
    };
  }

  const sorted = [...wages].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q2 = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const recommendedMin = Math.round(q1);
  const recommendedMax = Math.round(q3);
  const center = q2 > 0 ? q2 : 0;
  const avg = Math.round(q2);
  const deltaPercent = center > 0 ? Number((((currentPayAmount - center) / center) * 100).toFixed(1)) : null;
  const percentile = percentileRank(sorted, currentPayAmount);
  const confLabel = confidenceLabel(wages.length);
  const sampleBasis = `${bucketLabel(chosen)} · 최근 표본`;
  let riskLabel = "적정 범위에 가깝습니다.";
  if (wages.length < 10) {
    riskLabel = "표본이 적어 참고용으로 확인해 주세요.";
  } else if (percentile < 25) {
    riskLabel = "지원자 부족 가능성이 있습니다.";
  } else if (percentile > 75) {
    riskLabel = "비용 과다 가능성이 있습니다.";
  }
  return {
    avg,
    sampleCount: wages.length,
    sampleBasis,
    recommendedMin,
    recommendedMax,
    deltaPercent,
    p25: Math.round(q1),
    p50: Math.round(q2),
    p75: Math.round(q3),
    percentile,
    riskLabel,
    confidenceLabel: confLabel,
  };
}

export async function hasPremiumAccess(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, next_billing_at")
    .eq("user_id", userId)
    .maybeSingle();
  const status = (sub as { status?: string } | null)?.status ?? null;
  if (status === "active") return true;
  if (status === "cancelled" && (sub as { next_billing_at?: string | null } | null)?.next_billing_at) return true;
  return false;
}

