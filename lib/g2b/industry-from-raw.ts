/**
 * 나라장터 API raw에서 업종 코드 추출 → industries 테이블과 매칭
 * 한 공고에 여러 업종 가능. 매핑 근거(match_source, raw_value) 반환.
 */

export type IndustryRow = {
  code: string;
  name: string;
  aliases?: string[] | null;
  group_key?: string | null;
  sort_order?: number;
};

export type IndustryMatch = {
  code: string;
  match_source: "direct_code" | "direct_name" | "alias";
  raw_value: string;
};

export type IndustryMatchResult = {
  matches: IndustryMatch[];
  match_status: "matched" | "alias_matched" | "unclassified";
  raw_values: string[];
};

const RAW_KEYS_CODE = ["indstryCd", "indstry_cd", "업종코드", "prcureObjCd", "prcure_obj_cd"];
const RAW_KEYS_NAME = ["indstryNm", "indstry_nm", "업종명", "prcureObjNm", "prcure_obj_nm", "계약대상"];

/** 대표 업종 선정 우선순위: cleaning > disinfection > facility > labor > 기타(sort_order) */
const GROUP_PRIORITY: Record<string, number> = {
  cleaning: 1,
  disinfection: 2,
  facility: 3,
  labor: 4,
};

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function matchIndustryByCode(code: string, industries: IndustryRow[]): { code: string; raw_value: string } | null {
  const c = normalize(String(code));
  if (!c) return null;
  const found = industries.find((i) => i.code === c || normalize(i.code) === c);
  return found ? { code: found.code, raw_value: String(code).trim() } : null;
}

function matchIndustryByNameOrAlias(
  name: string,
  industries: IndustryRow[]
): { code: string; match_source: "direct_name" | "alias"; raw_value: string } | null {
  const n = normalize(name);
  if (!n || n.length < 2) return null;
  for (const ind of industries) {
    if (normalize(ind.name) === n) return { code: ind.code, match_source: "direct_name", raw_value: String(name).trim() };
    if (ind.aliases?.length) {
      for (const a of ind.aliases) {
        if (normalize(String(a)) === n) return { code: ind.code, match_source: "alias", raw_value: String(name).trim() };
        if (n.includes(normalize(String(a))) || normalize(String(a)).includes(n))
          return { code: ind.code, match_source: "alias", raw_value: String(name).trim() };
      }
    }
  }
  return null;
}

function collectValues(raw: Record<string, unknown>, keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const v = raw[k];
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const x of v) {
        const s = typeof x === "string" ? x : typeof x === "object" && x && "name" in x ? String((x as { name?: unknown }).name) : String(x);
        if (s.trim()) out.push(s.trim());
      }
    } else if (typeof v === "string") {
      const parts = v.split(/[,，\/]/).map((p) => p.trim()).filter(Boolean);
      out.push(...parts);
    } else {
      out.push(String(v).trim());
    }
  }
  return [...new Set(out)];
}

/**
 * raw에서 업종 매칭 결과 추출 (코드 + 매핑 근거 + 품질 상태)
 */
export function extractIndustryMatchesFromRaw(
  raw: Record<string, unknown> | null | undefined,
  industries: IndustryRow[]
): IndustryMatchResult {
  const rawValues: string[] = [];
  const matchMap = new Map<string, IndustryMatch>();

  if (!raw || typeof raw !== "object" || industries.length === 0) {
    return { matches: [], match_status: "unclassified", raw_values: [] };
  }

  const codeValues = collectValues(raw, RAW_KEYS_CODE);
  const nameValues = collectValues(raw, RAW_KEYS_NAME);
  rawValues.push(...codeValues, ...nameValues);

  let hasDirectCode = false;
  let hasNameOrAlias = false;

  for (const v of codeValues) {
    const res = matchIndustryByCode(v, industries);
    if (res && !matchMap.has(res.code)) {
      matchMap.set(res.code, { code: res.code, match_source: "direct_code", raw_value: res.raw_value });
      hasDirectCode = true;
    }
  }
  for (const v of nameValues) {
    const res = matchIndustryByNameOrAlias(v, industries);
    if (res && !matchMap.has(res.code)) {
      matchMap.set(res.code, { code: res.code, match_source: res.match_source, raw_value: res.raw_value });
      hasNameOrAlias = true;
    }
  }

  const match_status =
    hasDirectCode ? "matched" : hasNameOrAlias ? "alias_matched" : "unclassified";
  return {
    matches: [...matchMap.values()],
    match_status,
    raw_values: [...new Set(rawValues)],
  };
}

/**
 * 기존 호환: 코드 배열만 반환
 */
export function extractIndustryCodesFromRaw(
  raw: Record<string, unknown> | null | undefined,
  industries: IndustryRow[]
): string[] {
  return extractIndustryMatchesFromRaw(raw, industries).matches.map((m) => m.code);
}

/**
 * 대표 업종 1개 선정: group_key 우선순위(cleaning > disinfection > facility > labor) 후 sort_order
 */
export function pickPrimaryIndustryCode(
  codes: string[],
  industries: Pick<IndustryRow, "code" | "group_key" | "sort_order">[]
): string | null {
  if (codes.length === 0) return null;
  if (codes.length === 1) return codes[0];
  const byCode = new Map(industries.map((i) => [i.code, i]));
  const ordered = [...industries].sort((a, b) => {
    const pa = GROUP_PRIORITY[a.group_key ?? ""] ?? 99;
    const pb = GROUP_PRIORITY[b.group_key ?? ""] ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  for (const ind of ordered) {
    if (codes.includes(ind.code)) return ind.code;
  }
  return codes[0];
}
