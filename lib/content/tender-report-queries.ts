/**
 * tenders 집계: 일간(KST 일자 범위) + 업종관리(industries) 등록 업종 기준 조회·집계.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getKstDayRange, getKstDateString } from "./kst-utils";
import { parseRegionSido } from "@/lib/tender-utils";

export type TenderRow = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bsns_dstr_nm: string | null;
  base_amt: number | null;
  bid_clse_dt: string | null;
  bid_ntce_dt: string | null;
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
};

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
