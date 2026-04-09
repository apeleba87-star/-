/**
 * 홈 대시보드용: 등록 업종 기준 접수 중 입찰 건수·업종별 집계·최근 공고.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getBaseAmtFromRaw } from "@/lib/tender-utils";
import { getKstDayRange } from "./kst-utils";

export type HomeIndustryBreakdownItem = { industry_code: string; industry_name: string; count: number };
export type HomeTopIndustry = { code: string; name: string; count: number } | null;
export type HomeTenderPreview = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bid_clse_dt: string | null;
  bsns_dstr_nm: string | null;
  base_amt: number | null;
  raw?: unknown;
};

export type HomeTenderStats = {
  tenderCount: number;
  tenderTodayCount: number;
  topIndustry: HomeTopIndustry;
  industryBreakdown: HomeIndustryBreakdownItem[];
  recentTenders: HomeTenderPreview[];
};

/** 등록 업종 매칭 후 스포트라이트(지역 표시용) */
export type HomeSpotlightTenderRow = HomeTenderPreview & {
  bid_ntce_dt?: string | null;
  primary_industry_code?: string | null;
  region_sido_list?: unknown;
  dmand_instt_nm?: string | null;
};

type ActiveIndustryRow = { code: string; name: string; sort_order: number };

const OPEN_TENDERS_LIMIT = 2000;

/** 공고일 문자열 추출: bid_ntce_dt 우선, 없으면 raw에서 공고일시 파싱 (오늘 공고 집계용) */
function getNoticeDateStr(
  t: { bid_ntce_dt?: string | null; raw?: unknown }
): string | null {
  if (t.bid_ntce_dt != null && String(t.bid_ntce_dt).trim()) return t.bid_ntce_dt;
  const raw = t.raw as Record<string, unknown> | undefined;
  if (!raw) return null;
  const v = raw["bidNtceDt"] ?? raw["bid_ntce_dt"] ?? raw["공고일시"];
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const num = s.replace(/\D/g, "");
  if (num.length >= 8) {
    const y = num.slice(0, 4);
    const m = num.slice(4, 6);
    const d = num.slice(6, 8);
    const rest = num.length >= 14 ? `T${num.slice(8, 10)}:${num.slice(10, 12)}:${num.slice(12, 14)}` : "";
    return `${y}-${m}-${d}${rest ? rest + "Z" : ""}`;
  }
  return null;
}

function resolveSpotlightAmountWon(t: HomeSpotlightTenderRow): number | null {
  if (t.base_amt != null) {
    const n = Number(t.base_amt);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return getBaseAmtFromRaw(t.raw) ?? null;
}

/**
 * industries.is_active 업종 + tender_industries / primary_industry_code 로
 * 접수 중(bid_clse_dt > now) 공고만 매칭 (홈 집계·스포트라이트 공통).
 */
async function loadMatchedOpenTendersForHome(
  supabase: SupabaseClient,
  now: string
): Promise<
  | { kind: "no_active_industries" }
  | {
      kind: "ok";
      activeIndustries: ActiveIndustryRow[];
      matched: HomeSpotlightTenderRow[];
      tenderToCodes: Map<string, Set<string>>;
    }
> {
  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const activeIndustries = (industryRows ?? []) as ActiveIndustryRow[];
  const activeCodesSet = new Set(activeIndustries.map((i) => i.code));

  if (activeIndustries.length === 0) {
    return { kind: "no_active_industries" };
  }

  const { data: openRows } = await supabase
    .from("tenders")
    .select(
      "id, bid_ntce_nm, ntce_instt_nm, dmand_instt_nm, bid_clse_dt, bsns_dstr_nm, base_amt, bid_ntce_dt, primary_industry_code, raw, region_sido_list"
    )
    .gt("bid_clse_dt", now)
    .order("bid_clse_dt", { ascending: true })
    .limit(OPEN_TENDERS_LIMIT);

  const openTenders = (openRows ?? []) as HomeSpotlightTenderRow[];
  const openIds = openTenders.map((t) => t.id);

  let tiRows: { tender_id: string; industry_code: string }[] = [];
  if (openIds.length > 0) {
    const { data } = await supabase
      .from("tender_industries")
      .select("tender_id, industry_code")
      .in("tender_id", openIds)
      .in("industry_code", [...activeCodesSet]);
    tiRows = (data ?? []) as { tender_id: string; industry_code: string }[];
  }

  const tenderToCodes = new Map<string, Set<string>>();
  for (const t of openTenders) {
    const codes = new Set<string>();
    if (t.primary_industry_code && activeCodesSet.has(t.primary_industry_code)) {
      codes.add(t.primary_industry_code);
    }
    tenderToCodes.set(t.id, codes);
  }
  for (const row of tiRows) {
    if (!activeCodesSet.has(row.industry_code)) continue;
    if (!tenderToCodes.has(row.tender_id)) tenderToCodes.set(row.tender_id, new Set());
    tenderToCodes.get(row.tender_id)!.add(row.industry_code);
  }

  const matched = openTenders.filter((t) => (tenderToCodes.get(t.id)?.size ?? 0) > 0);

  return { kind: "ok", activeIndustries, matched, tenderToCodes };
}

/**
 * 등록 업종에 해당하는 접수 중 공고만 대상으로, 기초금액(또는 raw 추출)이 가장 큰 1건.
 * 금액을 알 수 있는 공고가 없으면 매칭 목록의 첫 건(마감 임박 순).
 */
export async function getHomeSpotlightTenderRowFromActiveIndustries(
  supabase: SupabaseClient,
  options?: { now?: string }
): Promise<HomeSpotlightTenderRow | null> {
  const now = options?.now ?? new Date().toISOString();
  const loaded = await loadMatchedOpenTendersForHome(supabase, now);
  if (loaded.kind !== "ok" || loaded.matched.length === 0) return null;

  let best: HomeSpotlightTenderRow | null = null;
  let bestAmt = -1;
  for (const t of loaded.matched) {
    const amt = resolveSpotlightAmountWon(t);
    if (amt != null && amt > bestAmt) {
      bestAmt = amt;
      best = t;
    }
  }
  if (best) return best;
  return loaded.matched[0];
}

/**
 * 등록 업종(is_active) 기준으로 접수 중(bid_clse_dt > now) 입찰을 집계하고,
 * 업종별 건수, 1위 업종, 최근 5건을 반환.
 */
export async function getHomeTenderStats(
  supabase: SupabaseClient,
  options?: { now?: string }
): Promise<HomeTenderStats> {
  const now = options?.now ?? new Date().toISOString();
  const { start: todayStart, end: todayEnd } = getKstDayRange();

  const loaded = await loadMatchedOpenTendersForHome(supabase, now);

  if (loaded.kind === "no_active_industries") {
    return {
      tenderCount: 0,
      tenderTodayCount: 0,
      topIndustry: null,
      industryBreakdown: [],
      recentTenders: [],
    };
  }

  const { activeIndustries, matched, tenderToCodes } = loaded;

  const tenderTodayCount = matched.filter((t) => {
    const dt = getNoticeDateStr(t);
    if (!dt) return false;
    return dt >= todayStart && dt <= todayEnd;
  }).length;

  const industryCountMap = new Map<string, number>();
  for (const ind of activeIndustries) {
    industryCountMap.set(ind.code, 0);
  }

  for (const t of matched) {
    const codes = tenderToCodes.get(t.id);
    if (!codes) continue;
    for (const code of codes) {
      industryCountMap.set(code, (industryCountMap.get(code) ?? 0) + 1);
    }
  }

  const industryBreakdown: HomeIndustryBreakdownItem[] = activeIndustries.map((ind) => ({
    industry_code: ind.code,
    industry_name: ind.name,
    count: industryCountMap.get(ind.code) ?? 0,
  }));

  const withCount = industryBreakdown.filter((i) => i.count > 0).sort((a, b) => b.count - a.count);
  const topIndustry: HomeTopIndustry = withCount.length
    ? { code: withCount[0].industry_code, name: withCount[0].industry_name, count: withCount[0].count }
    : null;

  const recentTenders: HomeTenderPreview[] = matched.slice(0, 5).map((t) => ({
    id: t.id,
    bid_ntce_nm: t.bid_ntce_nm,
    ntce_instt_nm: t.ntce_instt_nm,
    bid_clse_dt: t.bid_clse_dt,
    bsns_dstr_nm: t.bsns_dstr_nm ?? null,
    base_amt: t.base_amt != null ? Number(t.base_amt) : null,
    raw: t.raw,
  }));

  return {
    tenderCount: matched.length,
    tenderTodayCount,
    topIndustry,
    industryBreakdown,
    recentTenders,
  };
}
