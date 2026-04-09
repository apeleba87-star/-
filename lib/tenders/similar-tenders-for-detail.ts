import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidSido } from "@/lib/tenders/user-focus";

const MAX_ID_IN = 400;

export type SimilarTenderBrief = {
  id: string;
  bid_ntce_nm: string | null;
  ntce_instt_nm: string | null;
  bsns_dstr_nm: string | null;
  base_amt: number | null;
  bid_clse_dt: string | null;
};

export type SimilarTendersMode =
  | "industry_region"
  | "region_only"
  | "industry_only"
  | "latest_open";

export type SimilarTendersResult = {
  items: SimilarTenderBrief[];
  mode: SimilarTendersMode;
};

/**
 * 공고 상세용: 같은 업종·시도(있을 때) 기준으로 진행 중인 다른 공고 최대 10건.
 */
async function resolveIndustryIdPool(
  supabase: SupabaseClient,
  industryCodes: string[],
  excludeTenderId: string,
): Promise<string[] | null> {
  if (industryCodes.length === 0) return null;
  const { data: idRows } = await supabase
    .from("tender_industries")
    .select("tender_id")
    .in("industry_code", industryCodes);
  const seen = new Set<string>();
  for (const r of idRows ?? []) {
    const tid = String((r as { tender_id?: string }).tender_id ?? "").trim();
    if (tid && tid !== excludeTenderId) seen.add(tid);
  }
  const idPool = [...seen];
  if (idPool.length === 0) return [];
  return idPool.length > MAX_ID_IN ? idPool.slice(0, MAX_ID_IN) : idPool;
}

async function queryOpenTenders(
  supabase: SupabaseClient,
  opts: {
    excludeTenderId: string;
    nowIso: string;
    idPool?: string[] | null;
    regionSido?: string | null;
  },
): Promise<SimilarTenderBrief[]> {
  let q = supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_clse_dt")
    .neq("id", opts.excludeTenderId)
    .gte("bid_clse_dt", opts.nowIso);

  if (opts.idPool && opts.idPool.length > 0) q = q.in("id", opts.idPool);
  if (opts.regionSido && isValidSido(opts.regionSido)) q = q.contains("region_sido_list", [opts.regionSido]);

  const { data, error } = await q.order("bid_ntce_dt", { ascending: false, nullsFirst: false }).limit(10);
  if (error || !data?.length) return [];
  return data as SimilarTenderBrief[];
}

export async function fetchSimilarOpenTenders(
  supabase: SupabaseClient,
  opts: {
    excludeTenderId: string;
    industryCodes: string[];
    regionSido: string | null;
  }
): Promise<SimilarTendersResult> {
  const { excludeTenderId, industryCodes, regionSido } = opts;
  const nowIso = new Date().toISOString();
  const hasIndustry = industryCodes.length > 0;
  const hasRegion = isValidSido(regionSido);

  const idPool = hasIndustry
    ? await resolveIndustryIdPool(supabase, industryCodes, excludeTenderId)
    : null;

  // 1) 업종+지역 (기본)
  if (hasIndustry && hasRegion && idPool && idPool.length > 0) {
    const both = await queryOpenTenders(supabase, {
      excludeTenderId,
      nowIso,
      idPool,
      regionSido,
    });
    if (both.length > 0) return { items: both, mode: "industry_region" };
  }

  // 2) 같은 지역 fallback
  if (hasRegion) {
    const byRegion = await queryOpenTenders(supabase, {
      excludeTenderId,
      nowIso,
      regionSido,
    });
    if (byRegion.length > 0) return { items: byRegion, mode: "region_only" };
  }

  // 3) 같은 업종 fallback
  if (hasIndustry && idPool && idPool.length > 0) {
    const byIndustry = await queryOpenTenders(supabase, {
      excludeTenderId,
      nowIso,
      idPool,
    });
    if (byIndustry.length > 0) return { items: byIndustry, mode: "industry_only" };
  }

  // 4) 전체 최신 진행중
  const latest = await queryOpenTenders(supabase, {
    excludeTenderId,
    nowIso,
  });
  return { items: latest, mode: "latest_open" };
}
