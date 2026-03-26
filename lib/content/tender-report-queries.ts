/**
 * tenders 집계: 일간(KST 일자 범위) + 업종관리(industries) 등록 업종 기준 조회·집계.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getKstDayRange, getKstDateString, getKstWeekRange, getKstWeekKey } from "./kst-utils";
import { parseRegionSido } from "@/lib/tender-utils";

export type TenderRow = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bsns_dstr_nm: string | null;
  base_amt: number | null;
  bid_clse_dt: string | null;
  bid_ntce_dt: string | null;
  openg_dt?: string | null;
  primary_industry_code: string | null;
};

export type RegionBreakdownItem = { name: string; count: number };
export type IndustryBreakdownItem = { industry_code: string; industry_name: string; count: number };
export type TopIndustryItem = { code: string; name: string; count: number } | null;
export type TopTenderItem = {
  title: string;
  agency: string;
  budget: number;
  budgetLabel: string;
  deadline: string;
  deadlineLabel: string;
};

export type DailyTenderPayload = {
  date: string;
  dateLabel: string;
  count_total: number;
  budget_total: number;
  budget_label: string;
  region_breakdown: RegionBreakdownItem[];
  top_budget_tenders: TopTenderItem[];
  deadline_soon_tenders: TopTenderItem[];
  has_budget_unknown: boolean;
  source_count: number;
  /** 등록 업종별 당일 공고 건수 (sort_order 순). 레거시 payload에는 없을 수 있음. */
  industry_breakdown?: IndustryBreakdownItem[];
  /** 당일 공고 수 1위 업종. 레거시 payload에는 없을 수 있음. */
  top_industry?: TopIndustryItem;
  /** 당일 발주처 상위 분포(레거시 payload에는 없을 수 있음). */
  agency_breakdown?: { name: string; count: number }[];
  /** 당일 기초금액 밴드 분포(레거시 payload에는 없을 수 있음). */
  budget_band_breakdown?: { label: string; count: number }[];
};

export type WeeklyTenderPayload = {
  period_key: string;
  period_label: string;
  count_total: number;
  budget_total: number;
  budget_label: string;
  region_breakdown: RegionBreakdownItem[];
  top_budget_tenders: TopTenderItem[];
  deadline_soon_tenders: TopTenderItem[];
  has_budget_unknown: boolean;
  industry_breakdown?: IndustryBreakdownItem[];
  top_industry?: TopIndustryItem | null;
};

function dedupeTopTendersForPremium(a: TopTenderItem[], b: TopTenderItem[]): TopTenderItem[] {
  const seen = new Set<string>();
  const out: TopTenderItem[] = [];
  for (const t of [...a, ...b]) {
    const key = `${t.title}\0${t.agency}\0${t.budget}\0${t.deadline}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** 레거시 스냅샷 등에서 agency_breakdown이 없을 때 상위·마감임박 목록으로 근사 (scripts/backfill-report-snapshot-fields.mjs와 동일 규칙) */
export function buildAgencyBreakdownFromTopTenders(topTenders: TopTenderItem[]): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const t of topTenders) {
    const name = (t.agency ?? "").trim() || "기타";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function buildBudgetBandBreakdownFromTopTenders(
  topTenders: TopTenderItem[],
  hasBudgetUnknown: boolean
): { label: string; count: number }[] {
  const bands = new Map<string, number>([
    ["1천만원 미만", 0],
    ["1천만~5천만원", 0],
    ["5천만~1억원", 0],
    ["1억원 이상", 0],
    ["금액 미기재", hasBudgetUnknown ? 1 : 0],
  ]);
  for (const t of topTenders) {
    const amt = Number(t.budget);
    if (!Number.isFinite(amt) || amt <= 0) {
      bands.set("금액 미기재", (bands.get("금액 미기재") ?? 0) + 1);
    } else if (amt < 10_000_000) {
      bands.set("1천만원 미만", (bands.get("1천만원 미만") ?? 0) + 1);
    } else if (amt < 50_000_000) {
      bands.set("1천만~5천만원", (bands.get("1천만~5천만원") ?? 0) + 1);
    } else if (amt < 100_000_000) {
      bands.set("5천만~1억원", (bands.get("5천만~1억원") ?? 0) + 1);
    } else {
      bands.set("1억원 이상", (bands.get("1억원 이상") ?? 0) + 1);
    }
  }
  return Array.from(bands.entries()).map(([label, count]) => ({ label, count }));
}

/** 프리미엄 패널: 집계 필드가 비었으면 목록 기반으로 채움 */
export function resolvePremiumAgencyAndBudgetBands(payload: DailyTenderPayload): {
  agencies: { name: string; count: number }[];
  budgetBands: { label: string; count: number }[];
} {
  const pool = dedupeTopTendersForPremium(
    Array.isArray(payload.top_budget_tenders) ? payload.top_budget_tenders : [],
    Array.isArray(payload.deadline_soon_tenders) ? payload.deadline_soon_tenders : []
  );
  const rawAgencies = payload.agency_breakdown;
  const agencies =
    Array.isArray(rawAgencies) && rawAgencies.length > 0
      ? rawAgencies
      : buildAgencyBreakdownFromTopTenders(pool);
  const rawBands = payload.budget_band_breakdown;
  const budgetBands =
    Array.isArray(rawBands) && rawBands.length > 0
      ? rawBands
      : buildBudgetBandBreakdownFromTopTenders(pool, Boolean(payload.has_budget_unknown));
  return { agencies, budgetBands };
}

function getSido(row: TenderRow): string {
  const region = parseRegionSido(row.bsns_dstr_nm ?? row.ntce_instt_nm ?? null);
  return region ?? "기타";
}

/** 일간: KST 해당 일자 + 업종관리(is_active) 등록 업종에 해당하는 공고만 집계 */
export async function aggregateDailyTenders(
  supabase: SupabaseClient,
  date?: Date
): Promise<DailyTenderPayload> {
  const { start, end } = getKstDayRange(date);
  const runKey = getKstDateString(date);

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const activeIndustries = (industryRows ?? []) as { code: string; name: string; sort_order: number }[];
  const activeCodesSet = new Set(activeIndustries.map((i) => i.code));

  const { data: rows, error } = await supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_clse_dt, bid_ntce_dt, primary_industry_code")
    .gte("bid_ntce_dt", start)
    .lte("bid_ntce_dt", end)
    .order("base_amt", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`tenders 조회 실패: ${error.message}`);
  const dayTenders = (rows ?? []) as TenderRow[];

  if (activeIndustries.length === 0) {
    const dateLabel = formatDateLabel(runKey);
    return {
      date: runKey,
      dateLabel,
      count_total: 0,
      budget_total: 0,
      budget_label: formatBudget(0),
      region_breakdown: [],
      top_budget_tenders: [],
      deadline_soon_tenders: [],
      has_budget_unknown: false,
      source_count: 0,
      industry_breakdown: [],
      top_industry: null,
      agency_breakdown: [],
      budget_band_breakdown: [],
    };
  }

  const dayIds = dayTenders.map((t) => t.id);
  const tenderIdsSet = new Set(dayIds);

  let tiRows: { tender_id: string; industry_code: string }[] | null = null;
  if (dayIds.length > 0) {
    const { data } = await supabase
      .from("tender_industries")
      .select("tender_id, industry_code")
      .in("tender_id", dayIds)
      .in("industry_code", [...activeCodesSet]);
    tiRows = data as { tender_id: string; industry_code: string }[] | null;
  }

  const tenderToCodes = new Map<string, Set<string>>();
  for (const t of dayTenders) {
    const codes = new Set<string>();
    if (t.primary_industry_code && activeCodesSet.has(t.primary_industry_code)) {
      codes.add(t.primary_industry_code);
    }
    tenderToCodes.set(t.id, codes);
  }
  for (const row of tiRows ?? []) {
    if (!tenderIdsSet.has(row.tender_id) || !activeCodesSet.has(row.industry_code)) continue;
    tenderToCodes.get(row.tender_id)?.add(row.industry_code);
  }

  const list = dayTenders.filter((t) => (tenderToCodes.get(t.id)?.size ?? 0) > 0);

  let count_total = list.length;
  let budget_total = list.reduce((sum, r) => sum + (r.base_amt ?? 0), 0);
  let has_budget_unknown = list.some((r) => r.base_amt == null);

  const regionMap = new Map<string, number>();
  for (const r of list) {
    const sido = getSido(r);
    regionMap.set(sido, (regionMap.get(sido) ?? 0) + 1);
  }
  let region_breakdown: RegionBreakdownItem[] = Array.from(regionMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const industryCountMap = new Map<string, number>();
  for (const ind of activeIndustries) {
    industryCountMap.set(ind.code, 0);
  }
  for (const t of list) {
    const codes = tenderToCodes.get(t.id);
    if (!codes) continue;
    for (const code of codes) {
      industryCountMap.set(code, (industryCountMap.get(code) ?? 0) + 1);
    }
  }
  let industry_breakdown: IndustryBreakdownItem[] = activeIndustries.map((ind) => ({
    industry_code: ind.code,
    industry_name: ind.name,
    count: industryCountMap.get(ind.code) ?? 0,
  }));

  const topByCount = industry_breakdown.filter((i) => i.count > 0).sort((a, b) => b.count - a.count)[0];
  let top_industry: TopIndustryItem = topByCount
    ? { code: topByCount.industry_code, name: topByCount.industry_name, count: topByCount.count }
    : null;

  const withBudget = list.filter((r) => r.base_amt != null && r.base_amt > 0);
  const agencyMap = new Map<string, number>();
  for (const r of list) {
    const agency = (r.ntce_instt_nm ?? "").trim() || "기타";
    agencyMap.set(agency, (agencyMap.get(agency) ?? 0) + 1);
  }
  let agency_breakdown = Array.from(agencyMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const budgetBands = new Map<string, number>([
    ["1천만원 미만", 0],
    ["1천만~5천만원", 0],
    ["5천만~1억원", 0],
    ["1억원 이상", 0],
    ["금액 미기재", 0],
  ]);
  for (const r of list) {
    const amt = r.base_amt;
    if (amt == null || amt <= 0) {
      budgetBands.set("금액 미기재", (budgetBands.get("금액 미기재") ?? 0) + 1);
    } else if (amt < 10_000_000) {
      budgetBands.set("1천만원 미만", (budgetBands.get("1천만원 미만") ?? 0) + 1);
    } else if (amt < 50_000_000) {
      budgetBands.set("1천만~5천만원", (budgetBands.get("1천만~5천만원") ?? 0) + 1);
    } else if (amt < 100_000_000) {
      budgetBands.set("5천만~1억원", (budgetBands.get("5천만~1억원") ?? 0) + 1);
    } else {
      budgetBands.set("1억원 이상", (budgetBands.get("1억원 이상") ?? 0) + 1);
    }
  }
  let budget_band_breakdown = Array.from(budgetBands.entries()).map(([label, count]) => ({ label, count }));

  // 집계 테이블이 있으면 우선 사용해 raw 풀스캔 부담을 줄인다.
  const { data: agg } = await supabase
    .from("tender_daily_aggregates")
    .select("count_total, budget_total, has_budget_unknown, region_breakdown, industry_breakdown, top_industry, agency_breakdown, budget_band_breakdown")
    .eq("day_kst", runKey)
    .maybeSingle();
  if (agg) {
    count_total = Number((agg as { count_total?: number }).count_total ?? count_total);
    budget_total = Number((agg as { budget_total?: number }).budget_total ?? budget_total);
    has_budget_unknown = Boolean((agg as { has_budget_unknown?: boolean }).has_budget_unknown ?? has_budget_unknown);
    const aggRegions = (agg as { region_breakdown?: RegionBreakdownItem[] }).region_breakdown;
    const aggIndustries = (agg as { industry_breakdown?: IndustryBreakdownItem[] }).industry_breakdown;
    const aggTopIndustry = (agg as { top_industry?: TopIndustryItem }).top_industry;
    const aggAgencies = (agg as { agency_breakdown?: { name: string; count: number }[] }).agency_breakdown;
    const aggBands = (agg as { budget_band_breakdown?: { label: string; count: number }[] }).budget_band_breakdown;
    if (Array.isArray(aggRegions) && aggRegions.length) region_breakdown = aggRegions;
    if (Array.isArray(aggIndustries) && aggIndustries.length) industry_breakdown = aggIndustries;
    if (aggTopIndustry) top_industry = aggTopIndustry;
    if (Array.isArray(aggAgencies) && aggAgencies.length) agency_breakdown = aggAgencies;
    if (Array.isArray(aggBands) && aggBands.length) budget_band_breakdown = aggBands;
  }

  const top_budget_tenders: TopTenderItem[] = withBudget.slice(0, 5).map((r) => ({
    title: (r.bid_ntce_nm ?? "").trim() || "제목 없음",
    agency: (r.ntce_instt_nm ?? "").trim() || "—",
    budget: r.base_amt!,
    budgetLabel: formatBudget(r.base_amt!),
    deadline: r.bid_clse_dt ?? "",
    deadlineLabel: formatDeadline(r.bid_clse_dt),
  }));

  const byDeadline = [...list].sort((a, b) => {
    const da = a.bid_clse_dt ? new Date(a.bid_clse_dt).getTime() : Infinity;
    const db = b.bid_clse_dt ? new Date(b.bid_clse_dt).getTime() : Infinity;
    return da - db;
  });
  const deadline_soon_tenders: TopTenderItem[] = byDeadline.slice(0, 5).map((r) => ({
    title: (r.bid_ntce_nm ?? "").trim() || "제목 없음",
    agency: (r.ntce_instt_nm ?? "").trim() || "—",
    budget: r.base_amt ?? 0,
    budgetLabel: r.base_amt != null ? formatBudget(r.base_amt) : "—",
    deadline: r.bid_clse_dt ?? "",
    deadlineLabel: formatDeadline(r.bid_clse_dt),
  }));

  const dateLabel = formatDateLabel(runKey);

  return {
    date: runKey,
    dateLabel,
    count_total,
    budget_total,
    budget_label: formatBudget(budget_total),
    region_breakdown,
    top_budget_tenders,
    deadline_soon_tenders,
    has_budget_unknown,
    source_count: count_total,
    industry_breakdown,
    top_industry,
    agency_breakdown,
    budget_band_breakdown,
  };
}

function formatBudget(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000);
    return `${eok.toLocaleString()}억원`;
  }
  const man = Math.round(amount / 10_000);
  return `${man.toLocaleString()}만원`;
}

function formatDeadline(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

function formatDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

function formatWeekLabel(weekKey: string): string {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return weekKey;
  const [, year, week] = m;
  return `${year}년 ${parseInt(week, 10)}주차`;
}

/** 주간: KST 해당 주(월~일) + 등록 업종 기준 공고 집계 */
export async function aggregateWeeklyTenders(
  supabase: SupabaseClient,
  date?: Date
): Promise<WeeklyTenderPayload> {
  const { start, end } = getKstWeekRange(date);
  const periodKey = getKstWeekKey(date);

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const activeIndustries = (industryRows ?? []) as { code: string; name: string; sort_order: number }[];
  const activeCodesSet = new Set(activeIndustries.map((i) => i.code));

  const { data: rows, error } = await supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_clse_dt, bid_ntce_dt, primary_industry_code")
    .gte("bid_ntce_dt", start)
    .lte("bid_ntce_dt", end)
    .order("base_amt", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`tenders 주간 조회 실패: ${error.message}`);
  const weekTenders = (rows ?? []) as TenderRow[];

  if (activeIndustries.length === 0) {
    return {
      period_key: periodKey,
      period_label: formatWeekLabel(periodKey),
      count_total: 0,
      budget_total: 0,
      budget_label: formatBudget(0),
      region_breakdown: [],
      top_budget_tenders: [],
      deadline_soon_tenders: [],
      has_budget_unknown: false,
      industry_breakdown: [],
      top_industry: null,
    };
  }

  const tenderIds = weekTenders.map((t) => t.id);
  const tenderIdsSet = new Set(tenderIds);

  let tiRows: { tender_id: string; industry_code: string }[] | null = null;
  if (tenderIds.length > 0) {
    const { data } = await supabase
      .from("tender_industries")
      .select("tender_id, industry_code")
      .in("tender_id", tenderIds)
      .in("industry_code", [...activeCodesSet]);
    tiRows = data as { tender_id: string; industry_code: string }[] | null;
  }

  const tenderToCodes = new Map<string, Set<string>>();
  for (const t of weekTenders) {
    const codes = new Set<string>();
    if (t.primary_industry_code && activeCodesSet.has(t.primary_industry_code)) {
      codes.add(t.primary_industry_code);
    }
    tenderToCodes.set(t.id, codes);
  }
  for (const row of tiRows ?? []) {
    if (!tenderIdsSet.has(row.tender_id) || !activeCodesSet.has(row.industry_code)) continue;
    tenderToCodes.get(row.tender_id)?.add(row.industry_code);
  }

  const list = weekTenders.filter((t) => (tenderToCodes.get(t.id)?.size ?? 0) > 0);

  const count_total = list.length;
  const budget_total = list.reduce((sum, r) => sum + (r.base_amt ?? 0), 0);
  const has_budget_unknown = list.some((r) => r.base_amt == null);

  const regionMap = new Map<string, number>();
  for (const r of list) {
    const sido = getSido(r);
    regionMap.set(sido, (regionMap.get(sido) ?? 0) + 1);
  }
  const region_breakdown: RegionBreakdownItem[] = Array.from(regionMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const industryCountMap = new Map<string, number>();
  for (const ind of activeIndustries) {
    industryCountMap.set(ind.code, 0);
  }
  for (const t of list) {
    const codes = tenderToCodes.get(t.id);
    if (!codes) continue;
    for (const code of codes) {
      industryCountMap.set(code, (industryCountMap.get(code) ?? 0) + 1);
    }
  }
  const industry_breakdown: IndustryBreakdownItem[] = activeIndustries.map((ind) => ({
    industry_code: ind.code,
    industry_name: ind.name,
    count: industryCountMap.get(ind.code) ?? 0,
  }));

  const topByCount = industry_breakdown.filter((i) => i.count > 0).sort((a, b) => b.count - a.count)[0];
  const top_industry: TopIndustryItem = topByCount
    ? { code: topByCount.industry_code, name: topByCount.industry_name, count: topByCount.count }
    : null;

  const withBudget = list.filter((r) => r.base_amt != null && r.base_amt > 0);
  const top_budget_tenders: TopTenderItem[] = withBudget.slice(0, 5).map((r) => ({
    title: (r.bid_ntce_nm ?? "").trim() || "제목 없음",
    agency: (r.ntce_instt_nm ?? "").trim() || "—",
    budget: r.base_amt!,
    budgetLabel: formatBudget(r.base_amt!),
    deadline: r.bid_clse_dt ?? "",
    deadlineLabel: formatDeadline(r.bid_clse_dt),
  }));

  const byDeadline = [...list].sort((a, b) => {
    const da = a.bid_clse_dt ? new Date(a.bid_clse_dt).getTime() : Infinity;
    const db = b.bid_clse_dt ? new Date(b.bid_clse_dt).getTime() : Infinity;
    return da - db;
  });
  const deadline_soon_tenders: TopTenderItem[] = byDeadline.slice(0, 5).map((r) => ({
    title: (r.bid_ntce_nm ?? "").trim() || "제목 없음",
    agency: (r.ntce_instt_nm ?? "").trim() || "—",
    budget: r.base_amt ?? 0,
    budgetLabel: r.base_amt != null ? formatBudget(r.base_amt) : "—",
    deadline: r.bid_clse_dt ?? "",
    deadlineLabel: formatDeadline(r.bid_clse_dt),
  }));

  return {
    period_key: periodKey,
    period_label: formatWeekLabel(periodKey),
    count_total,
    budget_total,
    budget_label: formatBudget(budget_total),
    region_breakdown,
    top_budget_tenders,
    deadline_soon_tenders,
    has_budget_unknown,
    industry_breakdown,
    top_industry,
  };
}

/** 공통: TopTenderItem 리스트 생성 */
function toTopTenderItems(rows: TenderRow[], limit = 10): TopTenderItem[] {
  return rows.slice(0, limit).map((r) => ({
    title: (r.bid_ntce_nm ?? "").trim() || "제목 없음",
    agency: (r.ntce_instt_nm ?? "").trim() || "—",
    budget: r.base_amt ?? 0,
    budgetLabel: r.base_amt != null ? formatBudget(r.base_amt) : "—",
    deadline: r.bid_clse_dt ?? "",
    deadlineLabel: formatDeadline(r.bid_clse_dt),
  }));
}

/** 마감 임박(D-7 이내) + 등록 업종 기준 */
export type DeadlineSoonPayload = {
  period_key: string;
  period_label: string;
  count_total: number;
  over_100m_count: number;
  region_breakdown: RegionBreakdownItem[];
  top_tenders: TopTenderItem[];
};

export async function aggregateDeadlineSoonTenders(
  supabase: SupabaseClient,
  date?: Date
): Promise<DeadlineSoonPayload> {
  const periodKey = getKstWeekKey(date);
  const now = new Date();
  const nowPlus7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const endIso = nowPlus7.toISOString();

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const activeIndustries = (industryRows ?? []) as { code: string; name: string; sort_order: number }[];
  const activeCodesSet = new Set(activeIndustries.map((i) => i.code));

  if (activeIndustries.length === 0) {
    return { period_key: periodKey, period_label: formatWeekLabel(periodKey), count_total: 0, over_100m_count: 0, region_breakdown: [], top_tenders: [] };
  }

  const { data: rows, error } = await supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_clse_dt, bid_ntce_dt, primary_industry_code")
    .gt("bid_clse_dt", nowIso)
    .lt("bid_clse_dt", endIso)
    .order("base_amt", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`tenders 마감임박 조회 실패: ${error.message}`);
  const rawList = (rows ?? []) as TenderRow[];
  const tenderIds = rawList.map((t) => t.id);
  const tenderIdsSet = new Set(tenderIds);

  let tiRows: { tender_id: string; industry_code: string }[] | null = null;
  if (tenderIds.length > 0) {
    const { data } = await supabase
      .from("tender_industries")
      .select("tender_id, industry_code")
      .in("tender_id", tenderIds)
      .in("industry_code", [...activeCodesSet]);
    tiRows = data as { tender_id: string; industry_code: string }[] | null;
  }
  const tenderToCodes = new Map<string, Set<string>>();
  for (const t of rawList) {
    const codes = new Set<string>();
    if (t.primary_industry_code && activeCodesSet.has(t.primary_industry_code)) codes.add(t.primary_industry_code);
    tenderToCodes.set(t.id, codes);
  }
  for (const row of tiRows ?? []) {
    if (!tenderIdsSet.has(row.tender_id) || !activeCodesSet.has(row.industry_code)) continue;
    tenderToCodes.get(row.tender_id)?.add(row.industry_code);
  }
  const list = rawList.filter((t) => (tenderToCodes.get(t.id)?.size ?? 0) > 0);
  const over_100m_count = list.filter((r) => (r.base_amt ?? 0) >= 100_000_000).length;
  const regionMap = new Map<string, number>();
  for (const r of list) {
    const sido = getSido(r);
    regionMap.set(sido, (regionMap.get(sido) ?? 0) + 1);
  }
  const region_breakdown: RegionBreakdownItem[] = Array.from(regionMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    period_key: periodKey,
    period_label: formatWeekLabel(periodKey),
    count_total: list.length,
    over_100m_count,
    region_breakdown,
    top_tenders: toTopTenderItems(list, 5),
  };
}

/** 준비기간 5일 이하 공고 (이번 주 공고 중) */
export type PrepShortPayload = {
  period_key: string;
  period_label: string;
  count_total: number;
  top_tenders: (TopTenderItem & { prep_days?: number })[];
};

export async function aggregatePrepShortTenders(
  supabase: SupabaseClient,
  date?: Date
): Promise<PrepShortPayload> {
  const { start, end } = getKstWeekRange(date);
  const periodKey = getKstWeekKey(date);

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const activeIndustries = (industryRows ?? []) as { code: string; name: string; sort_order: number }[];
  const activeCodesSet = new Set(activeIndustries.map((i) => i.code));

  if (activeIndustries.length === 0) {
    return { period_key: periodKey, period_label: formatWeekLabel(periodKey), count_total: 0, top_tenders: [] };
  }

  const { data: rows, error } = await supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_clse_dt, bid_ntce_dt, primary_industry_code")
    .gte("bid_ntce_dt", start)
    .lte("bid_ntce_dt", end)
    .order("base_amt", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`tenders 준비기간 조회 실패: ${error.message}`);
  const rawList = (rows ?? []) as TenderRow[];
  const tenderIds = rawList.map((t) => t.id);
  const tenderIdsSet = new Set(tenderIds);

  let tiRows: { tender_id: string; industry_code: string }[] | null = null;
  if (tenderIds.length > 0) {
    const { data } = await supabase
      .from("tender_industries")
      .select("tender_id, industry_code")
      .in("tender_id", tenderIds)
      .in("industry_code", [...activeCodesSet]);
    tiRows = data as { tender_id: string; industry_code: string }[] | null;
  }
  const tenderToCodes = new Map<string, Set<string>>();
  for (const t of rawList) {
    const codes = new Set<string>();
    if (t.primary_industry_code && activeCodesSet.has(t.primary_industry_code)) codes.add(t.primary_industry_code);
    tenderToCodes.set(t.id, codes);
  }
  for (const row of tiRows ?? []) {
    if (!tenderIdsSet.has(row.tender_id) || !activeCodesSet.has(row.industry_code)) continue;
    tenderToCodes.get(row.tender_id)?.add(row.industry_code);
  }
  const list = rawList.filter((t) => (tenderToCodes.get(t.id)?.size ?? 0) > 0);
  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
  const prepShort = list.filter((t) => {
    if (!t.bid_clse_dt || !t.bid_ntce_dt) return false;
    const diff = new Date(t.bid_clse_dt).getTime() - new Date(t.bid_ntce_dt).getTime();
    return diff >= 0 && diff <= FIVE_DAYS_MS;
  });
  const top_tenders: (TopTenderItem & { prep_days?: number })[] = prepShort.slice(0, 5).map((r) => {
    const prepDays = r.bid_clse_dt && r.bid_ntce_dt
      ? Math.round((new Date(r.bid_clse_dt).getTime() - new Date(r.bid_ntce_dt).getTime()) / (24 * 60 * 60 * 1000))
      : undefined;
    return {
      title: (r.bid_ntce_nm ?? "").trim() || "제목 없음",
      agency: (r.ntce_instt_nm ?? "").trim() || "—",
      budget: r.base_amt ?? 0,
      budgetLabel: r.base_amt != null ? formatBudget(r.base_amt) : "—",
      deadline: r.bid_clse_dt ?? "",
      deadlineLabel: formatDeadline(r.bid_clse_dt),
      prep_days: prepDays,
    };
  });

  return {
    period_key: periodKey,
    period_label: formatWeekLabel(periodKey),
    count_total: prepShort.length,
    top_tenders,
  };
}

/** 대형 공고(기초금액 1억 이상) TOP 10, 이번 주 */
export type LargeTenderTopPayload = {
  period_key: string;
  period_label: string;
  count_total: number;
  budget_sum: number;
  budget_label: string;
  top_tenders: TopTenderItem[];
};

const ONE_HUNDRED_MILLION = 100_000_000;

export async function aggregateLargeTenderTop(
  supabase: SupabaseClient,
  date?: Date
): Promise<LargeTenderTopPayload> {
  const { start, end } = getKstWeekRange(date);
  const periodKey = getKstWeekKey(date);

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const activeIndustries = (industryRows ?? []) as { code: string; name: string; sort_order: number }[];
  const activeCodesSet = new Set(activeIndustries.map((i) => i.code));

  if (activeIndustries.length === 0) {
    return { period_key: periodKey, period_label: formatWeekLabel(periodKey), count_total: 0, budget_sum: 0, budget_label: formatBudget(0), top_tenders: [] };
  }

  const { data: rows, error } = await supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_clse_dt, bid_ntce_dt, primary_industry_code")
    .gte("bid_ntce_dt", start)
    .lte("bid_ntce_dt", end)
    .gte("base_amt", ONE_HUNDRED_MILLION)
    .order("base_amt", { ascending: false })
    .limit(50);

  if (error) throw new Error(`tenders 대형공고 조회 실패: ${error.message}`);
  const rawList = (rows ?? []) as TenderRow[];
  const tenderIds = rawList.map((t) => t.id);
  const tenderIdsSet = new Set(tenderIds);

  let tiRows: { tender_id: string; industry_code: string }[] | null = null;
  if (tenderIds.length > 0) {
    const { data } = await supabase
      .from("tender_industries")
      .select("tender_id, industry_code")
      .in("tender_id", tenderIds)
      .in("industry_code", [...activeCodesSet]);
    tiRows = data as { tender_id: string; industry_code: string }[] | null;
  }
  const tenderToCodes = new Map<string, Set<string>>();
  for (const t of rawList) {
    const codes = new Set<string>();
    if (t.primary_industry_code && activeCodesSet.has(t.primary_industry_code)) codes.add(t.primary_industry_code);
    tenderToCodes.set(t.id, codes);
  }
  for (const row of tiRows ?? []) {
    if (!tenderIdsSet.has(row.tender_id) || !activeCodesSet.has(row.industry_code)) continue;
    tenderToCodes.get(row.tender_id)?.add(row.industry_code);
  }
  const list = rawList.filter((t) => (tenderToCodes.get(t.id)?.size ?? 0) > 0);
  const budget_sum = list.reduce((s, r) => s + (r.base_amt ?? 0), 0);

  return {
    period_key: periodKey,
    period_label: formatWeekLabel(periodKey),
    count_total: list.length,
    budget_sum,
    budget_label: formatBudget(budget_sum),
    top_tenders: toTopTenderItems(list, 10),
  };
}

/** 개찰 예정(이번 주 openg_dt) 공고 */
export type OpeningScheduledPayload = {
  period_key: string;
  period_label: string;
  count_total: number;
  top_tenders: TopTenderItem[];
};

export async function aggregateOpeningScheduledTenders(
  supabase: SupabaseClient,
  date?: Date
): Promise<OpeningScheduledPayload> {
  const { start, end } = getKstWeekRange(date);
  const periodKey = getKstWeekKey(date);

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const activeIndustries = (industryRows ?? []) as { code: string; name: string; sort_order: number }[];
  const activeCodesSet = new Set(activeIndustries.map((i) => i.code));

  if (activeIndustries.length === 0) {
    return { period_key: periodKey, period_label: formatWeekLabel(periodKey), count_total: 0, top_tenders: [] };
  }

  const { data: rows, error } = await supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_clse_dt, bid_ntce_dt, openg_dt, primary_industry_code")
    .not("openg_dt", "is", null)
    .gte("openg_dt", start)
    .lte("openg_dt", end)
    .order("base_amt", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`tenders 개찰예정 조회 실패: ${error.message}`);
  const rawList = (rows ?? []) as TenderRow[];
  const tenderIds = rawList.map((t) => t.id);
  const tenderIdsSet = new Set(tenderIds);

  let tiRows: { tender_id: string; industry_code: string }[] | null = null;
  if (tenderIds.length > 0) {
    const { data } = await supabase
      .from("tender_industries")
      .select("tender_id, industry_code")
      .in("tender_id", tenderIds)
      .in("industry_code", [...activeCodesSet]);
    tiRows = data as { tender_id: string; industry_code: string }[] | null;
  }
  const tenderToCodes = new Map<string, Set<string>>();
  for (const t of rawList) {
    const codes = new Set<string>();
    if (t.primary_industry_code && activeCodesSet.has(t.primary_industry_code)) codes.add(t.primary_industry_code);
    tenderToCodes.set(t.id, codes);
  }
  for (const row of tiRows ?? []) {
    if (!tenderIdsSet.has(row.tender_id) || !activeCodesSet.has(row.industry_code)) continue;
    tenderToCodes.get(row.tender_id)?.add(row.industry_code);
  }
  const list = rawList.filter((t) => (tenderToCodes.get(t.id)?.size ?? 0) > 0);

  return {
    period_key: periodKey,
    period_label: formatWeekLabel(periodKey),
    count_total: list.length,
    top_tenders: toTopTenderItems(list, 5),
  };
}
