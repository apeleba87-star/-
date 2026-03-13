/**
 * 나라장터 입찰공고 상세/면허제한 API 응답에서 업종제한(입찰제한·면허명) 추출 → industries와 매칭
 * match_source = "detail_api" 로 저장. getBidPblancListInfoLicenseLimit 응답 지원.
 */

import type { IndustryRow, IndustryMatch } from "./industry-from-raw";

/** 상세/면허제한 API 응답 body.item 또는 items.item (단일 객체 또는 배열) */
const DETAIL_KEYS_CODE = [
  "indstryCd",
  "indstry_cd",
  "IndstryCd",
  "업종코드",
  "prcureObjCd",
  "prcure_obj_cd",
  "indstryCode",
  "industryCd",
  "industry_code",
  "lcnsSeCd",
  "lcns_se_cd",
  "lcnsspCd",
  "lcnssp_cd",
];
const DETAIL_KEYS_NAME = [
  "indstryNm",
  "indstry_nm",
  "IndstryNm",
  "업종명",
  "prcureObjNm",
  "prcure_obj_nm",
  "indstryName",
  "industryNm",
  "industry_nm",
  "업종별등록업체",
  "입찰제한업종",
  "lcnsNm",
  "lcns_nm",
  "LcnsNm",
  "lcnsLmtNm",
  "lcns_lmt_nm",
  "permsnIndstrytyList",
  "permsn_indstryty_list",
  "면허명",
  "제한업종",
  "제한면허",
  "참가자격",
  "허용업종목록",
  "indstrytyMfrcFldList",
  "indstryty_mfrc_fld_list",
];

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function matchByCode(code: string, industries: IndustryRow[]): { code: string; raw_value: string } | null {
  const c = normalize(String(code)).replace(/\s/g, "");
  if (!c || c.length < 2) return null;
  const found = industries.find(
    (i) => i.code === c || i.code === String(Number(c)) || normalize(i.code).replace(/\s/g, "") === c
  );
  return found ? { code: found.code, raw_value: String(code).trim() } : null;
}

function matchByName(
  name: string,
  industries: IndustryRow[]
): { code: string; raw_value: string } | null {
  const n = normalize(name);
  if (!n || n.length < 2) return null;
  const nCompact = n.replace(/\s/g, "");
  for (const ind of industries) {
    if (ind.name.replace(/\s/g, "") === nCompact || ind.name.includes(n) || n.includes(ind.name)) {
      return { code: ind.code, raw_value: String(name).trim() };
    }
    if (ind.aliases?.length) {
      for (const a of ind.aliases) {
        const aStr = String(a).replace(/\s/g, "");
        if (aStr === nCompact || n.includes(String(a).trim()) || String(a).trim().includes(n)) {
          return { code: ind.code, raw_value: String(name).trim() };
        }
      }
    }
  }
  return null;
}

function collectFromObj(obj: Record<string, unknown>, keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "string" && x.trim()) out.push(x.trim());
        if (typeof x === "object" && x && "code" in x && typeof (x as { code: unknown }).code === "string")
          out.push((x as { code: string }).code.trim());
        if (typeof x === "object" && x && "name" in x && typeof (x as { name: unknown }).name === "string")
          out.push((x as { name: string }).name.trim());
      }
    } else if (typeof v === "string") {
      const parts = v.split(/[,，\/\n;]/).map((p) => p.trim()).filter(Boolean);
      out.push(...parts);
    } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      for (const val of Object.values(v as Record<string, unknown>)) {
        if (typeof val === "string" && val.trim()) out.push(val.trim());
        if (Array.isArray(val)) {
          for (const x of val) {
            if (typeof x === "string" && x.trim()) out.push(x.trim());
          }
        }
      }
    } else {
      out.push(String(v).trim());
    }
  }
  return [...new Set(out)];
}

/** 괄호 안 코드 추출. "건물위생관리업(1162)", "건물위생관리업(1162) 업종을 등록한 업체" 모두 처리 */
function parseIndustryLabel(text: string): { name: string; code: string } | null {
  const s = normalize(text);
  if (!s) return null;
  const atEnd = s.match(/\s*([^(]+?)\s*\(\s*(\d+)\s*\)\s*$/);
  if (atEnd) {
    const name = atEnd[1].trim();
    const code = atEnd[2].trim();
    if (name.length >= 2 && code.length >= 2) return { name, code };
  }
  const inMiddle = s.match(/([^(]+?)\((\d+)\)/);
  if (inMiddle) {
    const name = inMiddle[1].trim().replace(/^\[|\]$/g, "");
    const code = inMiddle[2].trim();
    if (name.length >= 2 && code.length >= 2) return { name, code };
  }
  return null;
}

/**
 * 상세 API 응답에서 업종제한 추출 후 industries와 매칭.
 * 응답은 G2BListResponse 형태 → body.items.item 또는 body.item 사용.
 */
export function parseIndustryRestrictionsFromDetailResponse(
  detailRaw: Record<string, unknown> | null | undefined,
  industries: IndustryRow[]
): IndustryMatch[] {
  if (!detailRaw || typeof detailRaw !== "object" || industries.length === 0) return [];

  const matchMap = new Map<string, IndustryMatch>();

  // 단일 객체 또는 배열인 item 풀기
  const items: Record<string, unknown>[] = [];
  const raw = detailRaw as { response?: { body?: unknown }; body?: unknown };
  const body = raw.response?.body ?? raw.body ?? detailRaw;
  const b = body as Record<string, unknown> | undefined;
  if (b) {
    const itemsWrap = b.items as { item?: unknown } | undefined;
    const rawItem = itemsWrap?.item ?? b.item;
    if (rawItem !== undefined && rawItem !== null) {
      if (Array.isArray(rawItem)) items.push(...(rawItem as Record<string, unknown>[]));
      else items.push(rawItem as Record<string, unknown>);
    }
  }
  // 최상위가 이미 한 건 상세 객체인 경우
  if (items.length === 0 && detailRaw && !raw.response && !raw.body) {
    items.push(detailRaw);
  }

  for (const item of items) {
    const codes = collectFromObj(item, DETAIL_KEYS_CODE);
    const names = collectFromObj(item, DETAIL_KEYS_NAME);

    for (const rawCode of codes) {
      const res = matchByCode(rawCode, industries);
      if (res && !matchMap.has(res.code)) {
        matchMap.set(res.code, { code: res.code, match_source: "detail_api", raw_value: res.raw_value });
      }
    }
    for (const rawName of names) {
      const parsed = parseIndustryLabel(rawName);
      if (parsed) {
        const byCode = matchByCode(parsed.code, industries);
        if (byCode && !matchMap.has(byCode.code)) {
          matchMap.set(byCode.code, { code: byCode.code, match_source: "detail_api", raw_value: rawName });
        }
      } else {
        const byName = matchByName(rawName, industries);
        if (byName && !matchMap.has(byName.code)) {
          matchMap.set(byName.code, { code: byName.code, match_source: "detail_api", raw_value: byName.raw_value });
        }
      }
    }
  }

  return [...matchMap.values()];
}
