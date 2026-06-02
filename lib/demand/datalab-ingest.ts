import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToDateString, getKstTodayString } from "@/lib/jobs/kst-date";
import { DEMAND_DATALAB_GROUPS, type DemandKeywordKey } from "@/lib/demand/keyword-keys";
import { fetchNaverDatalabSearchTrend } from "@/lib/naver/datalab-client";

export type DemandDatalabIngestResult =
  | { ok: true; inserted: number; startDate: string; endDate: string; days: number }
  | { ok: false; error: string; needsKey?: boolean };

function getDatalabDaysBack(): number {
  const v = Number(process.env.DEMAND_DATALAB_DAYS_BACK ?? 60);
  if (!Number.isFinite(v)) return 60;
  return Math.min(Math.max(Math.round(v), 14), 90);
}

function normalizePeriodDate(period: string): string {
  return period.slice(0, 10);
}

function groupKeyFromTitle(title: string): DemandKeywordKey | null {
  const t = title.toLowerCase();
  if (t.includes("packing") || title.includes("포장")) return "packing";
  if (t.includes("move_in") || title.includes("입주")) return "move_in_clean";
  return null;
}

export async function runDemandDatalabDailyIngestJob(
  supabase: SupabaseClient
): Promise<DemandDatalabIngestResult> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      needsKey: true,
      error: "NAVER_CLIENT_ID and NAVER_CLIENT_SECRET are required for DataLab ingest",
    };
  }

  const days = getDatalabDaysBack();
  const todayKst = getKstTodayString();
  const endDate = addDaysToDateString(todayKst, -1);
  const startDate = addDaysToDateString(endDate, -(days - 1));

  try {
    const res = await fetchNaverDatalabSearchTrend({
      startDate,
      endDate,
      timeUnit: "date",
      keywordGroups: DEMAND_DATALAB_GROUPS.map((g) => ({
        groupName: g.groupName,
        keywords: g.keywords,
      })),
      clientId,
      clientSecret,
    });

    const rows: Array<{
      keyword_key: DemandKeywordKey;
      period_date: string;
      index_ratio: number;
      source: string;
      updated_at: string;
    }> = [];

    const now = new Date().toISOString();
    for (const result of res.results) {
      const key = groupKeyFromTitle(result.title);
      if (!key) continue;
      for (const point of result.data) {
        rows.push({
          keyword_key: key,
          period_date: normalizePeriodDate(point.period),
          index_ratio: Number(point.ratio) || 0,
          source: "datalab",
          updated_at: now,
        });
      }
    }

    if (rows.length === 0) {
      return { ok: false, error: "DataLab returned no daily rows" };
    }

    const { error, count } = await supabase
      .from("demand_keyword_daily")
      .upsert(rows, { onConflict: "keyword_key,period_date", count: "exact" });

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      inserted: count ?? rows.length,
      startDate,
      endDate,
      days,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
