import { getKstTodayString } from "@/lib/jobs/kst-date";
import { labelFromDemandRegionKey, parseDemandRegionKey } from "@/lib/demand/regions";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DemandRegionViewSource = "hub" | "region_scope" | "seo" | "share";

export type DemandRegionViewRankScope = "district" | "city" | "national" | "all";

export type DemandRegionViewInsert = {
  region_key: string;
  source: DemandRegionViewSource;
  user_id?: string | null;
  session_id?: string | null;
  anon_visitor_id?: string | null;
  page_path?: string | null;
  date_kst?: string;
};

export function isValidDemandRegionKey(regionKey: string): boolean {
  return parseDemandRegionKey(regionKey) != null;
}

/** YYYY-MM → [startInclusive, endExclusive) KST date_kst */
export function kstMonthDateRange(yyyyMm: string): [string, string] | null {
  if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return null;
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const endExclusive = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
  return [start, endExclusive];
}

export function currentKstYearMonth(): string {
  return getKstTodayString().slice(0, 7);
}

function rankKeyPrefix(scope: DemandRegionViewRankScope): string {
  if (scope === "district") return "district:";
  if (scope === "city") return "city:";
  if (scope === "national") return "national";
  return "";
}

export async function insertDemandRegionViewEvent(
  supabase: SupabaseClient,
  input: DemandRegionViewInsert
): Promise<boolean> {
  if (!isValidDemandRegionKey(input.region_key)) return false;

  const row = {
    region_key: input.region_key,
    source: input.source,
    date_kst: input.date_kst ?? getKstTodayString(),
    user_id: input.user_id ?? null,
    session_id: input.session_id?.slice(0, 256) ?? null,
    anon_visitor_id: input.anon_visitor_id?.slice(0, 256) ?? null,
    page_path: input.page_path?.slice(0, 1024) ?? null,
  };

  const { error } = await supabase.from("demand_region_view_events").insert(row);
  if (error) {
    console.error("[demand_region_view_events] insert:", error.message);
    return false;
  }
  return true;
}

export type DemandRegionViewStats = {
  regionKey: string;
  regionLabel: string;
  yearMonth: string;
  viewsRaw: number;
  uniqueSessions: number;
  uniqueVisitors: number;
  uniqueLoggedInUsers: number;
  bySource: Record<DemandRegionViewSource, number>;
};

type StatsRpcRow = {
  views_raw: number;
  unique_sessions: number;
  unique_visitors: number;
  unique_logged_in_users: number;
  hub_count: number;
  region_scope_count: number;
  seo_count: number;
  share_count: number;
};

function statsFromRpcRow(regionKey: string, yearMonth: string, row: StatsRpcRow): DemandRegionViewStats {
  return {
    regionKey,
    regionLabel: labelFromDemandRegionKey(regionKey),
    yearMonth,
    viewsRaw: Number(row.views_raw) || 0,
    uniqueSessions: Number(row.unique_sessions) || 0,
    uniqueVisitors: Number(row.unique_visitors) || 0,
    uniqueLoggedInUsers: Number(row.unique_logged_in_users) || 0,
    bySource: {
      hub: Number(row.hub_count) || 0,
      region_scope: Number(row.region_scope_count) || 0,
      seo: Number(row.seo_count) || 0,
      share: Number(row.share_count) || 0,
    },
  };
}

type EventRow = {
  source: string;
  session_id: string | null;
  anon_visitor_id: string | null;
  user_id: string | null;
};

function aggregateViewStatsLegacy(
  regionKey: string,
  yearMonth: string,
  rows: EventRow[]
): DemandRegionViewStats {
  const bySource: Record<DemandRegionViewSource, number> = {
    hub: 0,
    region_scope: 0,
    seo: 0,
    share: 0,
  };
  const sessions = new Set<string>();
  const visitors = new Set<string>();
  const users = new Set<string>();

  for (const row of rows) {
    const src = row.source as DemandRegionViewSource;
    if (src in bySource) bySource[src] += 1;
    if (row.session_id) sessions.add(row.session_id);
    if (row.anon_visitor_id) visitors.add(row.anon_visitor_id);
    if (row.user_id) users.add(row.user_id);
  }

  return {
    regionKey,
    regionLabel: labelFromDemandRegionKey(regionKey),
    yearMonth,
    viewsRaw: rows.length,
    uniqueSessions: sessions.size,
    uniqueVisitors: visitors.size,
    uniqueLoggedInUsers: users.size,
    bySource,
  };
}

/** RPC 집계 우선 — 마이그레이션 167 미적용 시 행 fetch 폴백 */
export async function loadDemandRegionViewStats(
  supabase: SupabaseClient,
  regionKey: string,
  yearMonth: string
): Promise<DemandRegionViewStats | null> {
  if (!isValidDemandRegionKey(regionKey)) return null;

  const { data: rpcData, error: rpcError } = await supabase.rpc("get_demand_region_view_stats", {
    p_region_key: regionKey,
    p_year_month: yearMonth,
  });

  if (!rpcError && rpcData?.[0]) {
    return statsFromRpcRow(regionKey, yearMonth, rpcData[0] as StatsRpcRow);
  }

  const range = kstMonthDateRange(yearMonth);
  if (!range) return null;
  const [start, endExclusive] = range;

  const { data, error } = await supabase
    .from("demand_region_view_events")
    .select("source, session_id, anon_visitor_id, user_id")
    .eq("region_key", regionKey)
    .gte("date_kst", start)
    .lt("date_kst", endExclusive);

  if (error) {
    console.error("[demand_region_view_events] stats:", error.message);
    return null;
  }

  return aggregateViewStatsLegacy(regionKey, yearMonth, (data ?? []) as EventRow[]);
}

export type DemandRegionViewRankRow = {
  regionKey: string;
  regionLabel: string;
  viewsRaw: number;
  uniqueSessions: number;
};

type RankRpcRow = {
  region_key: string;
  views_raw: number;
  unique_sessions: number;
};

/** RPC GROUP BY 우선 — 월 전체 행 로드 방지 */
export async function loadDemandRegionViewRank(
  supabase: SupabaseClient,
  yearMonth: string,
  limit = 50,
  scope: DemandRegionViewRankScope = "district"
): Promise<DemandRegionViewRankRow[]> {
  const prefix = rankKeyPrefix(scope);

  const { data: rpcData, error: rpcError } = await supabase.rpc("get_demand_region_view_rank", {
    p_year_month: yearMonth,
    p_limit: limit,
    p_key_prefix: prefix,
  });

  if (!rpcError && rpcData) {
    return (rpcData as RankRpcRow[]).map((row) => ({
      regionKey: row.region_key,
      regionLabel: labelFromDemandRegionKey(row.region_key),
      viewsRaw: Number(row.views_raw) || 0,
      uniqueSessions: Number(row.unique_sessions) || 0,
    }));
  }

  const range = kstMonthDateRange(yearMonth);
  if (!range) return [];
  const [start, endExclusive] = range;

  let query = supabase
    .from("demand_region_view_events")
    .select("region_key, session_id")
    .gte("date_kst", start)
    .lt("date_kst", endExclusive);

  if (prefix) {
    query = query.like("region_key", `${prefix}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[demand_region_view_events] rank:", error.message);
    return [];
  }

  const byKey = new Map<string, { raw: number; sessions: Set<string> }>();
  for (const row of data ?? []) {
    const key = row.region_key as string;
    if (!isValidDemandRegionKey(key)) continue;
    const agg = byKey.get(key) ?? { raw: 0, sessions: new Set<string>() };
    agg.raw += 1;
    if (row.session_id) agg.sessions.add(row.session_id as string);
    byKey.set(key, agg);
  }

  return [...byKey.entries()]
    .map(([regionKey, agg]) => ({
      regionKey,
      regionLabel: labelFromDemandRegionKey(regionKey),
      viewsRaw: agg.raw,
      uniqueSessions: agg.sessions.size,
    }))
    .sort((a, b) => b.viewsRaw - a.viewsRaw || b.uniqueSessions - a.uniqueSessions)
    .slice(0, limit);
}
