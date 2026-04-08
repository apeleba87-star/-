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

/**
 * 공고 상세용: 같은 업종·시도(있을 때) 기준으로 진행 중인 다른 공고 최대 10건.
 */
export async function fetchSimilarOpenTenders(
  supabase: SupabaseClient,
  opts: {
    excludeTenderId: string;
    industryCodes: string[];
    regionSido: string | null;
  }
): Promise<SimilarTenderBrief[]> {
  const { excludeTenderId, industryCodes, regionSido } = opts;
  const nowIso = new Date().toISOString();
  const hasIndustry = industryCodes.length > 0;
  const hasRegion = isValidSido(regionSido);

  if (!hasIndustry && !hasRegion) return [];

  let idPool: string[] | null = null;
  if (hasIndustry) {
    const { data: idRows } = await supabase
      .from("tender_industries")
      .select("tender_id")
      .in("industry_code", industryCodes);
    const seen = new Set<string>();
    for (const r of idRows ?? []) {
      const tid = String((r as { tender_id?: string }).tender_id ?? "").trim();
      if (tid && tid !== excludeTenderId) seen.add(tid);
    }
    idPool = [...seen];
    if (idPool.length === 0) return [];
    if (idPool.length > MAX_ID_IN) idPool = idPool.slice(0, MAX_ID_IN);
  }

  let q = supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_clse_dt")
    .neq("id", excludeTenderId)
    .gte("bid_clse_dt", nowIso);

  if (idPool) q = q.in("id", idPool);
  if (hasRegion) q = q.contains("region_sido_list", [regionSido!]);

  const { data, error } = await q.order("bid_ntce_dt", { ascending: false, nullsFirst: false }).limit(10);
  if (error || !data?.length) return [];

  return data as SimilarTenderBrief[];
}
