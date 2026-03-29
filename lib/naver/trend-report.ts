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
  /** 파생 제목 블록 상단 안내(발행 시 스냅샷) */
  titleIdeasNote?: string;
  window: { startDate: string; endDate: string; timeUnit: string };
  groups: GroupTrendRow[];
  rising: GroupTrendRow[];
  falling: GroupTrendRow[];
  stable: GroupTrendRow[];
  topThree: { groupName: string; id: string; hint: string }[];
  /** 선정 그룹(topThree)만, 그룹별 자기 템플릿에서 2제목씩(리포트 단위로 겹침 최소화) */
  suggestedTitles: Record<string, string[]>;
};

/** 공개 페이지·스냅샷에서 키워드당 노출하는 파생 제목 개수 */
export const MARKETING_SUGGESTED_TITLE_DISPLAY_CAP = 2;

function classify(delta: number): TrendBucket {
  if (delta >= STRONG_DELTA) return "rising";
  if (delta <= -STRONG_DELTA) return "falling";
  return "stable";
}

function applyTitleTemplate(tpl: string, main: string, sub: string, size: string): string {
  return tpl
    .replaceAll("{메인}", main)
    .replaceAll("{서브}", sub)
    .replaceAll("{크기}", size);
}

/** KST 리포트 기준일(YYYY-MM-DD) → UTC 일수(1970-01-01 기준) */
function rotationDayIndex(ymd: string): number {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function flattenSubSizeCombos(subs: string[], sizes: string[]): { sub: string; size: string }[] {
  const s = subs.map((x) => x.trim()).filter(Boolean);
  const z = sizes.map((x) => x.trim()).filter(Boolean);
  const out: { sub: string; size: string }[] = [];
  if (s.length > 0 && z.length > 0) {
    for (const sub of s) for (const size of z) out.push({ sub, size });
  } else if (s.length > 0) {
    for (const sub of s) out.push({ sub, size: "" });
  } else if (z.length > 0) {
    for (const size of z) out.push({ sub: "", size });
  } else {
    out.push({ sub: "", size: "" });
  }
  return out;
}

type GroupMetaForTitles = {
  sub_keywords: string[];
  size_keywords: string[];
  title_templates: string[];
  main: string;
};

const TOP_RANKS = 3;
const TITLES_PER_RANK = 2;
const SLOTS_PER_DAY = TOP_RANKS * TITLES_PER_RANK;

/** 같은 리포트에서 여러 키워드에 반복되기 쉬운 문구 — 템플릿 문자열 기준으로 전역 1회까지 우선 제한 */
const TITLE_DIVERSITY_MARKERS = ["한눈에 정리"] as const;
const MAX_USES_PER_MARKER_GLOBAL = 1;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function exceedsMarkerBudget(tpl: string, markerCounts: Map<string, number>, maxPer: number): boolean {
  for (const m of TITLE_DIVERSITY_MARKERS) {
    if (tpl.includes(m) && (markerCounts.get(m) ?? 0) >= maxPer) return true;
  }
  return false;
}

function registerMarkers(tpl: string, markerCounts: Map<string, number>): void {
  for (const m of TITLE_DIVERSITY_MARKERS) {
    if (tpl.includes(m)) markerCounts.set(m, (markerCounts.get(m) ?? 0) + 1);
  }
}

type PickPass = "strict" | "noMarker" | "any";

/**
 * 그룹마다 해당 그룹의 title_templates만 사용. 리포트 전체에서 (1) 동일 템플릿 줄 재사용 금지,
 * (2) TITLE_DIVERSITY_MARKERS 문구는 가능하면 리포트당 1번만 쓰도록 배정. 불가하면 단계적으로 완화.
 */
function buildRotatedSuggestedTitles(
  reportDateYmd: string,
  topThree: { id: string; groupName: string }[],
  groupMeta: Map<string, GroupMetaForTitles>
): Record<string, string[]> {
  const dayRot = rotationDayIndex(reportDateYmd);
  const suggestedTitles: Record<string, string[]> = {};
  const usedRawTemplates = new Set<string>();
  const markerCounts = new Map<string, number>();

  function tryPickFromGroup(tpls: string[], base: number, k: number, pass: PickPass): string | null {
    const tg = tpls.length;
    if (tg === 0) return null;
    for (let o = 0; o < tg; o += 1) {
      const ti = (base + k + o) % tg;
      const tpl = tpls[ti]!;
      if (pass === "strict" || pass === "noMarker") {
        if (usedRawTemplates.has(tpl)) continue;
      }
      if (pass === "strict" && exceedsMarkerBudget(tpl, markerCounts, MAX_USES_PER_MARKER_GLOBAL)) continue;
      return tpl;
    }
    return null;
  }

  topThree.forEach((t, i) => {
    const meta = groupMeta.get(t.id);
    if (!meta) return;
    const main = meta.main.trim() || t.groupName;
    const tpls = (meta.title_templates ?? []).map((x) => x.trim()).filter(Boolean);
    const combos = flattenSubSizeCombos(meta.sub_keywords, meta.size_keywords);
    const C = Math.max(combos.length, 1);
    const titles: string[] = [];

    if (tpls.length === 0) {
      suggestedTitles[t.groupName] = titles;
      return;
    }

    const tg = tpls.length;
    const base = (dayRot * 7 + hashString(t.id) + i * 13) % tg;

    for (let k = 0; k < TITLES_PER_RANK; k += 1) {
      const ci = ((dayRot * SLOTS_PER_DAY + i * TITLES_PER_RANK + k) % C + C) % C;
      const { sub, size } = combos[ci]!;

      const tpl =
        tryPickFromGroup(tpls, base, k, "strict") ??
        tryPickFromGroup(tpls, base, k, "noMarker") ??
        tryPickFromGroup(tpls, base, k, "any") ??
        tpls[(base + k) % tg]!;

      usedRawTemplates.add(tpl);
      registerMarkers(tpl, markerCounts);

      let title = applyTitleTemplate(tpl, main, sub, size);
      title = title.replace(/\s{2,}/g, " ").trim();
      titles.push(title);
    }

    suggestedTitles[t.groupName] = titles;
  });

  return suggestedTitles;
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
    .select("id, group_name, keywords, sort_order, sub_keywords, size_keywords, title_templates")
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
          titleIdeasNote:
            "아래는 관리자가 등록한 템플릿·서브·크기로 배정한 예시 제목입니다. 그룹마다 자기 템플릿만 쓰며 리포트 단위로 겹침을 줄입니다. {지역}은 실제 지명으로 바꿔 쓰세요.",
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
      const keywordGroups: DatalabKeywordGroup[] = chunk.map((row) => {
        const kw = (row.keywords as string[]) ?? [];
        const main = (kw[0] ?? row.group_name).trim() || row.group_name;
        return {
          groupName: row.group_name,
          keywords: [main],
        };
      });

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

  const groupMeta = new Map(
    list.map((g) => [
      g.id,
      {
        sub_keywords: (g.sub_keywords as string[]) ?? [],
        size_keywords: (g.size_keywords as string[]) ?? [],
        title_templates: (g.title_templates as string[]) ?? [],
        main: ((g.keywords as string[])?.[0] ?? g.group_name).trim() || g.group_name,
      },
    ])
  );

  const suggestedTitles = buildRotatedSuggestedTitles(endDate, topThree, groupMeta);

  const payload: DailyReportPayload = {
    disclaimer:
      "네이버 데이터랩 통합검색 검색어 트렌드 기준이며, 수치는 기간 내 상대 비율(최고값=100)입니다. 실제 검색 건수가 아닙니다.",
    titleIdeasNote:
      "파생 아이디어는 데이터랩이 아니라 관리자 등록 템플릿·서브·크기로 만듭니다. 키워드(그룹)마다 그 그룹에 등록된 템플릿만 쓰며, 같은 리포트 안에서는 동일 템플릿 줄과 반복 문구(예: 한눈에 정리)가 여러 키워드에 겹치지 않도록 최대한 피해 배정합니다. {지역}은 실제 지명으로 바꿔 쓰세요.",
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
