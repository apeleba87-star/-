import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToDateString, getKstTodayString } from "@/lib/jobs/kst-date";
import { fetchNaverDatalabSearchTrend, type DatalabKeywordGroup } from "@/lib/naver/datalab-client";

const STRONG_DELTA = 10;

export type TrendBucket = "rising" | "falling" | "stable";

export type GroupTrendRow = {
  id: string;
  groupName: string;
  latest: number;
  previous: number;
  delta: number;
  bucket: TrendBucket;
  avg7: number | null;
};

export type DailyReportPayload = {
  disclaimer: string;
  window: { startDate: string; endDate: string; timeUnit: string };
  groups: GroupTrendRow[];
  rising: GroupTrendRow[];
  falling: GroupTrendRow[];
  stable: GroupTrendRow[];
  topThree: { groupName: string; id: string; hint: string }[];
  suggestedTitles: Record<string, string[]>;
};

function classify(delta: number): TrendBucket {
  if (delta >= STRONG_DELTA) return "rising";
  if (delta <= -STRONG_DELTA) return "falling";
  return "stable";
}

function buildSuggestedTitles(groupName: string): string[] {
  return [
    `${groupName} 비용·체크리스트 총정리`,
    `${groupName} 업체 선택 기준 3가지`,
    `2026 ${groupName} 트렌드, 꼭 알아둘 점`,
  ];
}

function periodToDate(period: string): string {
  return period.slice(0, 10);
}

/**
 * KST 기준 어제를 window end로 하여 데이터랩을 호출하고 DB에 스냅샷·일일 리포트를 저장합니다.
 */
export async function runNaverTrendReportJob(supabase: SupabaseClient): Promise<{
  ok: boolean;
  report_date?: string;
  error?: string;
  groups_fetched?: number;
}> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return { ok: false, error: "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET not set" };
  }

  const todayKst = getKstTodayString();
  const endDate = addDaysToDateString(todayKst, -1);
  const startDate = addDaysToDateString(endDate, -29);

  const { data: groups, error: gErr } = await supabase
    .from("naver_trend_keyword_groups")
    .select("id, group_name, keywords, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (gErr) return { ok: false, error: gErr.message };
  const list = groups ?? [];
  if (list.length === 0) {
    await supabase.from("naver_trend_daily_reports").upsert(
      {
        report_date: endDate,
        headline: "등록된 키워드 그룹이 없습니다.",
        payload: {
          disclaimer:
            "관리자에서 키워드 그룹을 추가한 뒤 다시 실행하세요. 지표는 네이버 통합검색 검색어 트렌드(상대값)입니다.",
          window: { startDate, endDate, timeUnit: "date" },
          groups: [],
          rising: [],
          falling: [],
          stable: [],
          topThree: [],
          suggestedTitles: {},
        } as DailyReportPayload,
        fetch_error: "no_keyword_groups",
        computed_at: new Date().toISOString(),
      },
      { onConflict: "report_date" }
    );
    return { ok: true, report_date: endDate, groups_fetched: 0 };
  }

  const chunks: (typeof list)[] = [];
  for (let i = 0; i < list.length; i += 5) {
    chunks.push(list.slice(i, i + 5));
  }

  try {
    for (const chunk of chunks) {
      const keywordGroups: DatalabKeywordGroup[] = chunk.map((row) => ({
        groupName: row.group_name,
        keywords: row.keywords as string[],
      }));

      const json = await fetchNaverDatalabSearchTrend({
        startDate,
        endDate,
        timeUnit: "date",
        keywordGroups,
        clientId,
        clientSecret,
      });

      const rows: {
        keyword_group_id: string;
        window_end_date: string;
        period_date: string;
        ratio: number;
      }[] = [];

      for (const r of json.results) {
        const row = chunk.find((c) => c.group_name === r.title);
        if (!row) continue;
        for (const d of r.data) {
          rows.push({
            keyword_group_id: row.id,
            window_end_date: endDate,
            period_date: periodToDate(d.period),
            ratio: Number(d.ratio),
          });
        }
      }

      if (rows.length > 0) {
        const { error: delErr } = await supabase
          .from("naver_trend_datapoints")
          .delete()
          .eq("window_end_date", endDate)
          .in(
            "keyword_group_id",
            chunk.map((c) => c.id)
          );
        if (delErr) return { ok: false, error: delErr.message };

        const { error: insErr } = await supabase.from("naver_trend_datapoints").insert(rows);
        if (insErr) return { ok: false, error: insErr.message };
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("naver_trend_daily_reports").upsert(
      {
        report_date: endDate,
        headline: "데이터를 불러오지 못했습니다.",
        payload: { error: msg },
        fetch_error: msg,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "report_date" }
    );
    return { ok: false, error: msg, report_date: endDate };
  }

  const { data: points, error: pErr } = await supabase
    .from("naver_trend_datapoints")
    .select("keyword_group_id, period_date, ratio")
    .eq("window_end_date", endDate)
    .order("period_date", { ascending: true });

  if (pErr) return { ok: false, error: pErr.message };

  const byGroup = new Map<string, { period_date: string; ratio: number }[]>();
  for (const p of points ?? []) {
    const gid = p.keyword_group_id as string;
    const listP = byGroup.get(gid) ?? [];
    listP.push({ period_date: p.period_date as string, ratio: Number(p.ratio) });
    byGroup.set(gid, listP);
  }

  const groupTrends: GroupTrendRow[] = [];
  for (const g of list) {
    const series = (byGroup.get(g.id) ?? []).sort((a, b) => a.period_date.localeCompare(b.period_date));
    if (series.length < 2) continue;
    const latest = series[series.length - 1];
    const previous = series[series.length - 2];
    const last7 = series.slice(-7);
    const avg7 = last7.length ? last7.reduce((s, x) => s + x.ratio, 0) / last7.length : null;
    const delta = latest.ratio - previous.ratio;
    groupTrends.push({
      id: g.id,
      groupName: g.group_name,
      latest: latest.ratio,
      previous: previous.ratio,
      delta,
      bucket: classify(delta),
      avg7,
    });
  }

  const rising = groupTrends.filter((t) => t.bucket === "rising").sort((a, b) => b.delta - a.delta);
  const falling = groupTrends.filter((t) => t.bucket === "falling").sort((a, b) => a.delta - b.delta);
  const stable = groupTrends.filter((t) => t.bucket === "stable");

  let headline = "어제 기준 청소 관련 검색 관심도를 정리했어요.";
  if (rising[0]) {
    headline = `「${rising[0].groupName}」 검색 관심도가 전일 대비 크게 올랐어요.`;
  } else if (falling[0] && !rising[0]) {
    headline = `「${falling[0].groupName}」 관심도는 전일 대비 낮아진 흐름이에요.`;
  }

  const topThree: DailyReportPayload["topThree"] = [];
  const used = new Set<string>();
  for (const t of rising) {
    if (topThree.length >= 3) break;
    topThree.push({
      id: t.id,
      groupName: t.groupName,
      hint: "전일 대비 관심도 상승",
    });
    used.add(t.id);
  }
  for (const t of groupTrends.sort((a, b) => b.latest - a.latest)) {
    if (topThree.length >= 3) break;
    if (used.has(t.id)) continue;
    topThree.push({
      id: t.id,
      groupName: t.groupName,
      hint: "최근 관심도가 높은 편",
    });
    used.add(t.id);
  }

  const suggestedTitles: Record<string, string[]> = {};
  for (const t of groupTrends) {
    suggestedTitles[t.groupName] = buildSuggestedTitles(t.groupName);
  }

  const payload: DailyReportPayload = {
    disclaimer:
      "네이버 데이터랩 통합검색 검색어 트렌드 기준이며, 수치는 기간 내 상대 비율(최고값=100)입니다. 실제 검색 건수가 아닙니다.",
    window: { startDate, endDate, timeUnit: "date" },
    groups: groupTrends,
    rising,
    falling,
    stable,
    topThree,
    suggestedTitles,
  };

  const { error: repErr } = await supabase.from("naver_trend_daily_reports").upsert(
    {
      report_date: endDate,
      headline,
      payload: payload as unknown as Record<string, unknown>,
      fetch_error: null,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "report_date" }
  );

  if (repErr) return { ok: false, error: repErr.message };

  return { ok: true, report_date: endDate, groups_fetched: list.length };
}
