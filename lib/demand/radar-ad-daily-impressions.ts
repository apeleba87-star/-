import { getKstTodayString, getKstTodayUtcRange } from "@/lib/jobs/kst-date";
import { createServiceSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

type CountRow = { slot_id: string; impression_count: number };

async function loadCountsViaSlotQueries(
  supabase: SupabaseClient,
  slotIds: string[],
  counts: Record<string, number>
): Promise<Record<string, number>> {
  const [start, end] = getKstTodayUtcRange();
  const results = await Promise.all(
    slotIds.map(async (slotId) => {
      const { count, error } = await supabase
        .from("radar_ad_events")
        .select("id", { count: "exact", head: true })
        .eq("slot_id", slotId)
        .eq("event_type", "impression")
        .gte("created_at", start)
        .lte("created_at", end);
      if (error) {
        console.error("[radar-ad-daily-impressions]", slotId, error.message);
        return { slotId, count: 0 };
      }
      return { slotId, count: count ?? 0 };
    })
  );
  for (const { slotId, count } of results) {
    counts[slotId] = count;
  }
  return counts;
}

/** KST 오늘 impression 이벤트 수 — 배너 로테이션 균형용 */
export async function loadRadarAdDailyImpressionCounts(
  slotIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of slotIds) counts[id] = 0;
  if (slotIds.length === 0) return counts;

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch (err) {
    console.error(
      "[radar-ad-daily-impressions] SUPABASE_SERVICE_ROLE_KEY missing — fair rotation uses zeros",
      err instanceof Error ? err.message : err
    );
    return counts;
  }

  const today = getKstTodayString();
  const { data, error } = await supabase.rpc("radar_ad_impression_counts_for_date", {
    p_slot_ids: slotIds,
    p_stats_date: today,
  });

  if (error) {
    console.error("[radar-ad-daily-impressions] rpc:", error.message);
    return loadCountsViaSlotQueries(supabase, slotIds, counts);
  }

  for (const row of (data ?? []) as CountRow[]) {
    counts[row.slot_id] = Number(row.impression_count) || 0;
  }
  return counts;
}
