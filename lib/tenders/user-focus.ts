import type { SupabaseClient } from "@supabase/supabase-js";
import { REGION_GUGUN, REGION_SIDO_LIST, type RegionSido } from "@/lib/listings/regions";

export type UserTenderFocusRow = {
  user_id: string;
  region_sido: string | null;
  region_gugun: string | null;
  industry_codes: string[];
  updated_at: string;
};

const SIDO_SET = new Set<string>(REGION_SIDO_LIST as unknown as string[]);

export function isValidSido(value: string | null | undefined): value is string {
  return value != null && value !== "" && SIDO_SET.has(value);
}

export function isValidGugunForSido(sido: string, gugun: string | null | undefined): boolean {
  if (gugun == null || gugun === "") return true;
  const list = REGION_GUGUN[sido as RegionSido];
  return Array.isArray(list) && list.includes(gugun);
}

export function normalizeIndustryCodes(codes: string[]): string[] {
  const seen = new Set<string>();
  for (const c of codes) {
    const t = c.trim();
    if (t) seen.add(t);
    if (seen.size >= 4) break;
  }
  return [...seen].slice(0, 4);
}

/** URL/폼의 시군구 값 검증 (시도가 있을 때만) */
export function parseGugunParam(
  sido: string | null,
  gugunParam: string | null | undefined
): string | null {
  if (!isValidSido(sido)) return null;
  const g = (gugunParam ?? "").trim();
  if (!g || g === "__sido_only__") return null;
  return isValidGugunForSido(sido, g) ? g : null;
}

function nowIsoForOpenTenders(): string {
  return new Date().toISOString();
}

/**
 * 진행 중 공고 수 (bid_clse_dt >= now). industry / 시도 / 시군구 옵션.
 */
export async function countOpenTenders(
  supabase: SupabaseClient,
  options: {
    industryCodes?: string[];
    regionSido?: string | null;
    regionGugun?: string | null;
  } = {}
): Promise<number> {
  const { industryCodes = [], regionSido, regionGugun } = options;
  const nowIso = nowIsoForOpenTenders();

  let tenderIds: string[] | null = null;
  if (industryCodes.length > 0) {
    const { data: idRows } = await supabase
      .from("tender_industries")
      .select("tender_id")
      .in("industry_code", industryCodes);
    tenderIds = [...new Set((idRows ?? []).map((r) => r.tender_id))];
    if (tenderIds.length === 0) return 0;
  }

  let q = supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .gte("bid_clse_dt", nowIso);

  if (tenderIds != null) q = q.in("id", tenderIds);
  if (isValidSido(regionSido)) {
    q = q.contains("region_sido_list", [regionSido]);
    if (regionGugun && regionGugun.length > 0) {
      q = q.ilike("bsns_dstr_nm", `%${regionGugun}%`);
    }
  }

  const { count, error } = await q;
  if (error) throw new Error(`countOpenTenders: ${error.message}`);
  return count ?? 0;
}

export function focusMatchesUrl(
  focus: Pick<UserTenderFocusRow, "region_sido" | "region_gugun" | "industry_codes"> | null,
  url: {
    industryCodes: string[];
    regionSido: string | null;
    regionGugun: string | null;
  }
): boolean {
  if (!focus) return false;
  const a = [...(focus.industry_codes ?? [])].sort().join(",");
  const b = [...url.industryCodes].sort().join(",");
  const fs = focus.region_sido ?? null;
  const fg = focus.region_gugun ?? null;
  const us = url.regionSido;
  const ug = url.regionGugun;
  return a === b && fs === us && fg === ug;
}

export function buildTendersSearchParams(url: {
  industryCodes: string[];
  regionSido: string | null;
  regionGugun: string | null;
  sort?: string;
}): string {
  const q = new URLSearchParams();
  if (url.industryCodes.length > 0) q.set("industry", url.industryCodes.join(","));
  if (isValidSido(url.regionSido)) q.set("region", url.regionSido!);
  if (url.regionGugun) q.set("gugun", url.regionGugun);
  if (url.sort && url.sort !== "posted") q.set("sort", url.sort);
  const s = q.toString();
  return s ? `?${s}` : "";
}
