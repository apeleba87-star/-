import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidSido } from "@/lib/tenders/user-focus";

/**
 * 업종·지역 필터 → 해당하는 tenders.id 목록.
 * null = 필터 없음(전체 낙찰 요약). [] = 조건에 맞는 공고 없음.
 */
export async function resolveTenderIdsForAwardFilter(
  supabase: SupabaseClient,
  opts: {
    industryCodes: string[];
    regionSido: string | null;
    regionGugun: string | null;
  }
): Promise<string[] | null> {
  const { industryCodes, regionSido, regionGugun } = opts;
  const hasIndustry = industryCodes.length > 0;
  const hasRegion = isValidSido(regionSido);

  if (!hasIndustry && !hasRegion) return null;

  let ids: string[] | null = null;

  if (hasIndustry) {
    const { data, error } = await supabase
      .from("tender_industries")
      .select("tender_id")
      .in("industry_code", industryCodes);
    if (error) throw new Error(error.message);
    ids = [...new Set((data ?? []).map((r) => r.tender_id as string))];
    if (ids.length === 0) return [];
  }

  if (hasRegion) {
    let tq = supabase.from("tenders").select("id");
    if (ids != null) {
      tq = tq.in("id", ids);
    }
    tq = tq.contains("region_sido_list", [regionSido!]);
    if (regionGugun && regionGugun.length > 0) {
      tq = tq.ilike("bsns_dstr_nm", `%${regionGugun}%`);
    }
    const { data: trows, error: terr } = await tq;
    if (terr) throw new Error(terr.message);
    const regionIds = (trows ?? []).map((r) => r.id as string);
    if (ids != null) {
      const set = new Set(regionIds);
      ids = ids.filter((id) => set.has(id));
    } else {
      ids = regionIds;
    }
    if (ids.length === 0) return [];
  }

  return ids;
}
