import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMAND_KEYWORD_KEYS, type DemandKeywordKey } from "@/lib/demand/keyword-keys";

export type DemandDatalabSyncFromTrendResult =
  | { ok: true; inserted: number; source: "naver_trend_datapoints"; matched: string[] }
  | { ok: false; error: string };

const KEYWORD_MATCHERS: { key: DemandKeywordKey; test: (text: string) => boolean }[] = [
  { key: "packing", test: (t) => t === "포장이사" || t.includes("포장이사") },
  { key: "move_in_clean", test: (t) => t === "입주청소" || t.includes("입주청소") },
];

function groupMatchesKey(
  group: { group_name: string; keywords: string[] },
  key: DemandKeywordKey
): boolean {
  const matcher = KEYWORD_MATCHERS.find((m) => m.key === key);
  if (!matcher) return false;
  if (matcher.test(group.group_name)) return true;
  return (group.keywords ?? []).some((kw) => matcher.test(String(kw)));
}

/**
 * 마케팅 트렌드(naver_trend_datapoints) → demand_keyword_daily.
 * NAVER_CLIENT_* 가 로컬에 없어도, Vercel에서 트렌드 수집이 돌아간 DB가 있으면 입주수요 허브에 반영.
 */
export async function syncDemandKeywordDailyFromNaverTrend(
  supabase: SupabaseClient
): Promise<DemandDatalabSyncFromTrendResult> {
  const { data: groups, error: gErr } = await supabase
    .from("naver_trend_keyword_groups")
    .select("id, group_name, keywords")
    .eq("is_active", true);

  if (gErr) return { ok: false, error: gErr.message };
  if (!groups?.length) {
    return { ok: false, error: "naver_trend_keyword_groups에 활성 그룹이 없습니다." };
  }

  const rows: Array<{
    keyword_key: DemandKeywordKey;
    region_scope: string;
    region_key: string;
    search_phrase: string;
    period_date: string;
    index_ratio: number;
    source: string;
    updated_at: string;
  }> = [];
  const matched: string[] = [];
  const now = new Date().toISOString();

  for (const key of DEMAND_KEYWORD_KEYS) {
    const group = groups.find((g) => groupMatchesKey(g as { group_name: string; keywords: string[] }, key));
    if (!group) continue;

    const { data: points, error: pErr } = await supabase
      .from("naver_trend_datapoints")
      .select("period_date, ratio, window_end_date")
      .eq("keyword_group_id", group.id)
      .order("period_date", { ascending: true });

    if (pErr) return { ok: false, error: pErr.message };
    if (!points?.length) continue;

    /** 윈도우별 중복 일자 — 최신 window_end_date 값 우선 */
    const byPeriod = new Map<string, { period_date: string; ratio: number; windowEnd: string }>();
    for (const p of points) {
      const periodDate = String(p.period_date).slice(0, 10);
      const windowEnd = String(p.window_end_date ?? "");
      const prev = byPeriod.get(periodDate);
      if (!prev || windowEnd >= prev.windowEnd) {
        byPeriod.set(periodDate, {
          period_date: periodDate,
          ratio: Number(p.ratio) || 0,
          windowEnd,
        });
      }
    }

    const deduped = [...byPeriod.values()].sort((a, b) =>
      a.period_date.localeCompare(b.period_date)
    );
    if (deduped.length === 0) continue;

    matched.push(`${key}:${group.group_name}(${deduped.length}d)`);
    const searchPhrase = key === "packing" ? "포장이사" : "입주청소";
    for (const p of deduped) {
      rows.push({
        keyword_key: key,
        region_scope: "national",
        region_key: "kr",
        search_phrase: searchPhrase,
        period_date: String(p.period_date).slice(0, 10),
        index_ratio: Number(p.ratio) || 0,
        source: "naver_trend",
        updated_at: now,
      });
    }
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error:
        "트렌드 DB에 포장이사·입주청소 그룹 데이터가 없습니다. /admin/naver-trend-keywords 에서 그룹·수집을 먼저 실행하세요.",
    };
  }

  const { error, count } = await supabase
    .from("demand_keyword_daily")
    .upsert(rows, {
      onConflict: "keyword_key,region_scope,region_key,period_date,source",
      count: "exact",
    });

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    inserted: count ?? rows.length,
    source: "naver_trend_datapoints",
    matched,
  };
}
