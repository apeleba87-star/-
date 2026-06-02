import type { SupabaseClient } from "@supabase/supabase-js";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import {
  DEMAND_SEARCHAD_KEYWORDS,
  type DemandKeywordKey,
} from "@/lib/demand/keyword-keys";
import { fetchSearchAdKeywordVolume, getSearchAdCredentials } from "@/lib/naver/searchad-keyword-client";

export type DemandSearchAdMonthlyIngestResult =
  | { ok: true; inserted: number; yyyymm: string }
  | { ok: false; error: string; needsKey?: boolean; skipped?: boolean };

function currentYyyymmKst(): string {
  return getKstTodayString().slice(0, 7);
}

export async function runDemandSearchAdMonthlyIngestJob(
  supabase: SupabaseClient
): Promise<DemandSearchAdMonthlyIngestResult> {
  if (!getSearchAdCredentials()) {
    return {
      ok: false,
      needsKey: true,
      skipped: true,
      error:
        "Search Ad credentials missing (NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID)",
    };
  }

  const yyyymm = currentYyyymmKst();
  const rows: Array<{
    keyword_key: DemandKeywordKey;
    yyyymm: string;
    search_volume_month: number | null;
    search_volume_below_ten: boolean;
    index_mom_percent: number;
    source: string;
    updated_at: string;
  }> = [];

  const now = new Date().toISOString();

  try {
    for (const key of Object.keys(DEMAND_SEARCHAD_KEYWORDS) as DemandKeywordKey[]) {
      const keyword = DEMAND_SEARCHAD_KEYWORDS[key];
      const vol = await fetchSearchAdKeywordVolume(keyword);
      rows.push({
        keyword_key: key,
        yyyymm,
        search_volume_month: vol?.total ?? null,
        search_volume_below_ten: vol?.belowTen ?? false,
        index_mom_percent: 0,
        source: "searchad",
        updated_at: now,
      });
    }

    const { error, count } = await supabase
      .from("demand_keyword_monthly")
      .upsert(rows, { onConflict: "keyword_key,yyyymm", count: "exact" });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, inserted: count ?? rows.length, yyyymm };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
