/**
 * tenders 집계: 일간(KST 일자 범위) 조회 후 애플리케이션에서 집계.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getKstDayRange } from "./kst-utils";
import { parseRegionSido } from "@/lib/tender-utils";

export type TenderRow = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bsns_dstr_nm: string | null;
  base_amt: number | null;
  bid_clse_dt: string | null;
  bid_ntce_dt: string | null;
};

export type RegionBreakdownItem = { name: string; count: number };
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
};

function getSido(row: TenderRow): string {
  const region = parseRegionSido(row.bsns_dstr_nm ?? row.ntce_instt_nm ?? null);
  return region ?? "기타";
}

/** 일간: KST 오늘 기준 tenders 조회 후 집계 */
export async function aggregateDailyTenders(
  supabase: SupabaseClient,
  date?: Date
): Promise<DailyTenderPayload> {
  const { start, end } = getKstDayRange(date);
  const runKey = start.slice(0, 10);

  const { data: rows, error } = await supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_clse_dt, bid_ntce_dt")
    .gte("bid_ntce_dt", start)
    .lte("bid_ntce_dt", end)
    .order("base_amt", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`tenders 조회 실패: ${error.message}`);
  const list = (rows ?? []) as TenderRow[];

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
