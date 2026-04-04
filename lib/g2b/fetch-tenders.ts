/**
 * 나라장터 입찰 목록 수집 → tenders upsert + tender_industries(업종) 매핑.
 * - 수집 구간: 기본은 KST 기준 최근 24시간. `lookbackMinutes` 주면 그 분만큼만(크론용).
 * - 용역(Servc)만 수집. 공사/물품 미수집.
 * - 업종: (1) 목록 API 텍스트 매칭 (2) 면허제한 API 14일치 → 공고번호로 DB 매칭
 *   (3) ServcPPSSrch(업종코드별)로 건물위생관리업(1162) 등 정확 반영.
 */

import { createClient } from "@/lib/supabase-server";
import { getBidPblancListInfoServc, getBidPblancListInfoLicenseLimitByRange, getBidPblancListInfoServcPPSSrch, getBidPblancListInfoServcBsisAmountByRange, extractItems } from "./client";
import { parseIndustryRestrictionsFromDetailResponse } from "./industry-from-detail";
import { mapItemToTender, matchKeywords } from "./mapper";
import { computeCategoryScores } from "./clean-score";
import { getTenderKeywordOptionsByCategory, type CategoryKeywordOptions } from "./keywords";
import {
  extractIndustryMatchesFromRaw,
  pickPrimaryIndustryCode,
  type IndustryRow,
  type IndustryMatchResult,
} from "./industry-from-raw";
import { getTenderKeywordsEnabled } from "@/lib/app-settings";
import { parseRegionSidoList, getBaseAmtFromRaw } from "@/lib/tender-utils";

function getSupabase() {
  return createClient();
}

const DEFAULT_KEYWORDS = [
  "청소", "미화", "위생", "시설관리", "환경미화", "건물청소", "소독", "방역", "용역청소",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toYmdHm = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Date를 KST 시각으로 해석한 뒤 YYYYMMDDHHmm (API는 게시일자 기준 KST 사용) */
function toYmdHmKst(utcDate: Date): string {
  const kst = new Date(utcDate.getTime() + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}${pad(kst.getUTCHours())}${pad(kst.getUTCMinutes())}`;
}

/** 지금 시각 기준 최근 24시간 구간 — KST 기준 (API 게시일자가 KST이므로 서버가 UTC여도 오늘 18일 전체 포함) */
function getDateRangeLast24HoursKst(): { inqryBgnDt: string; inqryEndDt: string } {
  return getDateRangeLookbackKst(24 * 60 * 60 * 1000);
}

/** 지금 시각 기준 최근 lookbackMs 구간 — KST YYYYMMDDHHmm (게시일자 조회용) */
function getDateRangeLookbackKst(lookbackMs: number): { inqryBgnDt: string; inqryEndDt: string } {
  const now = new Date();
  const endKst = toYmdHmKst(now);
  const startUtc = new Date(now.getTime() - lookbackMs);
  const startKst = toYmdHmKst(startUtc);
  return {
    inqryBgnDt: startKst,
    inqryEndDt: endKst,
  };
}

/**
 * Vercel Cron 등 자동 수집: 4시간마다 돌릴 때 슬롯 사이 빈틈을 줄이기 위한 10분 겹침.
 * KST 기준 (inqryBgnDt ~ inqryEndDt) ≈ 최근 4시간 10분.
 */
export const G2B_CRON_LOOKBACK_MINUTES = 4 * 60 + 10;

/** 조회 당일 00:00 ~ 23:59 (면허제한 API용) */
function getDateRangeToday(): { inqryBgnDt: string; inqryEndDt: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return {
    inqryBgnDt: toYmdHm(start),
    inqryEndDt: toYmdHm(end),
  };
}

const NUM_OF_ROWS = 100;
const BATCH_UPSERT_SIZE = 100;

export type FetchProgress = {
  phase: "fetch" | "upsert" | "license";
  total?: number;
  done?: number;
  message?: string;
};

const EMPTY_KEYWORD_OPTIONS: CategoryKeywordOptions = {
  cleaning: { includeKeywords: [], excludeKeywords: [] },
  disinfection: { includeKeywords: [], excludeKeywords: [] },
  globalExclude: [],
};

/** 용역(Servc)만 수집. 공사/물품은 수집하지 않음. */
async function fetchOperation(
  range: { inqryBgnDt: string; inqryEndDt: string },
  allIncludeKeywords: string[],
  optionsByCategory: { cleaning: { includeKeywords: string[]; excludeKeywords: string[] }; disinfection: { includeKeywords: string[]; excludeKeywords: string[] }; globalExclude: string[] },
  industries: IndustryRow[],
  onProgress?: (p: FetchProgress) => void
): Promise<{ payloads: Record<string, unknown>[]; industryMatchesList: IndustryMatchResult[] }> {
  const allItems: Record<string, unknown>[] = [];
  let pageNo = 1;
  for (;;) {
    const data = await getBidPblancListInfoServc({
      ...range,
      pageNo,
      numOfRows: NUM_OF_ROWS,
    });
    const items = extractItems(data);
    const list = Array.isArray(items) ? items : [items];
    allItems.push(...(list as Record<string, unknown>[]));
    onProgress?.({ phase: "fetch", done: allItems.length, message: `용역 API 수집 중… ${allItems.length}건` });
    if (list.length < NUM_OF_ROWS) break;
    pageNo += 1;
    if (pageNo > 50) break;
  }

  const payloads: Record<string, unknown>[] = [];
  const industryMatchesList: IndustryMatchResult[] = [];
  let firstItemLogged = false;
  for (const item of allItems) {
    const raw = item as Record<string, unknown>;
    // 첫 번째 아이템의 raw 필드 목록 로그 (목록 API가 어떤 업종 필드를 반환하는지 확인용)
    if (!firstItemLogged && process.env.NODE_ENV !== "production") {
      const keys = Object.keys(raw);
      const industryKeys = keys.filter(k =>
        /indstry|lcns|업종|면허|srvce|srvc|divNm|clsfc/i.test(k)
      );
      console.log("[G2B 목록] 첫 번째 아이템 전체 필드:", keys.join(", "));
      console.log("[G2B 목록] 업종 관련 필드:", industryKeys.length ? industryKeys.map(k => `${k}=${JSON.stringify(raw[k])}`).join(", ") : "(없음)");
      firstItemLogged = true;
    }
    const mapped = mapItemToTender(raw);
    const title = String(mapped.bid_ntce_nm ?? "");
    const matched = matchKeywords(title, allIncludeKeywords);
    (mapped as Record<string, unknown>).keywords_matched = matched.length > 0 ? matched : null;

    const detailText = [raw.bidNtceDtl, raw.prcureObjDtl, raw.ntceSpecDocCn].filter(Boolean).join(" ");
    const categories = computeCategoryScores(title, detailText || undefined, optionsByCategory);
    (mapped as Record<string, unknown>).categories = categories;
    (mapped as Record<string, unknown>).is_clean_related = categories.includes("cleaning");
    (mapped as Record<string, unknown>).clean_score = categories.length ? 50 : 0;
    (mapped as Record<string, unknown>).clean_reason = { categories };
    (mapped as Record<string, unknown>).manual_override = false;
    (mapped as Record<string, unknown>).manual_tag = null;

    const industryResult = extractIndustryMatchesFromRaw(raw, industries);
    industryMatchesList.push(industryResult);

    if (industryResult.matches.length > 0) {
      const primary = pickPrimaryIndustryCode(industryResult.matches.map((m) => m.code), industries);
      (mapped as Record<string, unknown>).primary_industry_code = primary ?? null;
      (mapped as Record<string, unknown>).industry_match_status = industryResult.match_status;
      (mapped as Record<string, unknown>).industry_name_raw =
        industryResult.raw_values.slice(0, 3).join(" / ") || null;
    } else {
      (mapped as Record<string, unknown>).primary_industry_code = null;
      (mapped as Record<string, unknown>).industry_match_status = null;
      (mapped as Record<string, unknown>).industry_name_raw = null;
    }
    const regionText = [raw.bsnsDstrNm, raw.bsns_dstr_nm, raw.ntceInsttNm, raw.ntce_instt_nm].filter(Boolean).join(" ");
    (mapped as Record<string, unknown>).region_sido_list = parseRegionSidoList(regionText || undefined);

    const payload = mapped as Record<string, unknown>;
    const { source: _s, ...rest } = payload;
    payloads.push(rest);
  }
  return { payloads, industryMatchesList };
}

export async function runTenderFetch(options?: {
  /** @deprecated 옵션만 전달되며, 구간은 lookbackMinutes/기본 24h로만 결정됨 */
  daysBack?: number;
  /** KST 게시일자 조회 구간 = 지금 − 이 분 ~ 지금. 미지정 시 최근 24시간 */
  lookbackMinutes?: number;
  onProgress?: (p: FetchProgress) => void;
}): Promise<{
  ok: boolean;
  tenders: number;
  inserted: number;
  updated: number;
  licenseReflected?: number;
  /** 목록 API extractIndustryMatchesFromRaw 업종 반영 공고 수 */
  listApiMatchedCount?: number;
  /** 면허제한 API에서 수집된 원본 공고 수 (grouping 전 raw 건수) */
  licenseRawCount?: number;
  /** 면허제한 API 호출 중 에러가 발생한 경우 메시지 */
  licenseError?: string;
  error?: string;
  /** 개발용: 면허제한 API에서 데이터를 받은 공고 키 목록 (공고번호|차수) */
  licenseKeys?: string[];
  /** 개발용: 위 키 중 목록 API와 매칭되어 DB에 반영된 키 목록 */
  matchedLicenseKeys?: string[];
  /** 개발용: 목록 수집으로 만든 키 (fullIdByKey) - licenseKeys와 형식 비교용 */
  listKeys?: string[];
  /** ServcPPSSrch(업종코드별)로 반영한 공고 수 */
  ppssrchMatchedCount?: number;
  /** 기초금액 상세 API로 채운 base_amt 건수 */
  baseAmtFilled?: number;
}> {
  const range =
    options?.lookbackMinutes != null && options.lookbackMinutes > 0
      ? getDateRangeLookbackKst(options.lookbackMinutes * 60 * 1000)
      : getDateRangeLast24HoursKst();
  const supabase = getSupabase();
  const keywordsEnabled = await getTenderKeywordsEnabled(supabase);
  const byCategory = keywordsEnabled ? await getTenderKeywordOptionsByCategory() : EMPTY_KEYWORD_OPTIONS;
  const allInclude = [...byCategory.cleaning.includeKeywords, ...byCategory.disinfection.includeKeywords];
  const includeForMatch = keywordsEnabled && allInclude.length ? allInclude : [];
  const onProgress = options?.onProgress;

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, aliases, group_key, sort_order")
    .eq("is_active", true);
  const industries: IndustryRow[] = (industryRows ?? []).map((r) => ({
    code: r.code,
    name: r.name,
    aliases: r.aliases ?? undefined,
    group_key: r.group_key ?? undefined,
    sort_order: r.sort_order ?? 0,
  }));

  try {
    onProgress?.({ phase: "fetch", message: "API 수집 중 (용역)…" });

    const result = await fetchOperation(range, includeForMatch, byCategory, industries, onProgress);
    const allPayloads = result.payloads;
    const total = allPayloads.length;

    onProgress?.({ phase: "upsert", total, done: 0, message: `저장 중 (총 ${total}건)…` });

    let processed = 0;
    const now = new Date().toISOString();
    const fullIdByKey = new Map<string, string>();
    for (let i = 0; i < allPayloads.length; i += BATCH_UPSERT_SIZE) {
      const batch = allPayloads.slice(i, i + BATCH_UPSERT_SIZE);
      const { data: upserted, error } = await supabase
        .from("tenders")
        .upsert(batch, {
          onConflict: "bid_ntce_no,bid_ntce_ord",
          ignoreDuplicates: false,
        })
        .select("id, bid_ntce_no, bid_ntce_ord");
      if (error) throw error;

      const idByKey = new Map<string, string>();
      const batchIds: string[] = [];
      const normNo = (v: unknown) =>
        String(v ?? "").trim().replace(/\s/g, "").replace(/-000$/i, "");
      const normOrd = (v: unknown) => {
        const s = String(v ?? "00").replace(/\D/g, "");
        const num = parseInt(s, 10) || 0;
        if (num <= 1) return "00";
        return String(num).padStart(2, "0").slice(-2);
      };
      for (const row of upserted ?? []) {
        const k = `${normNo(row.bid_ntce_no)}|${normOrd(row.bid_ntce_ord)}`;
        idByKey.set(k, row.id);
        fullIdByKey.set(k, row.id);
        batchIds.push(row.id);
      }

      const rawRows = batch
        .map((p) => {
          const k = `${normNo(p.bid_ntce_no)}|${normOrd(p.bid_ntce_ord)}`;
          const tenderId = idByKey.get(k);
          const raw = (p.raw ?? null) as Record<string, unknown> | null;
          if (!tenderId || !raw) return null;
          return {
            tender_id: tenderId,
            raw,
            updated_at: now,
          };
        })
        .filter(Boolean) as { tender_id: string; raw: Record<string, unknown>; updated_at: string }[];
      if (rawRows.length > 0) {
        await supabase.from("tender_raw_payloads").upsert(rawRows, { onConflict: "tender_id" });
      }

      processed += batch.length;
      onProgress?.({ phase: "upsert", total, done: processed, message: `저장 완료 (${processed}/${total}건)…` });
    }

    // ─── [Phase 1] 목록 API 업종 매칭 → tender_industries 저장 ─────────────────────────
    // extractIndustryMatchesFromRaw가 이미 각 payload에 primary_industry_code 등을 세팅했음.
    // 여기서는 tender_industries 행도 삽입.
    const normNo = (v: unknown) => String(v ?? "").trim().replace(/\s/g, "").replace(/-000$/i, "");
    const normOrdFn = (v: unknown) => {
      const s = String(v ?? "00").replace(/\D/g, "");
      const num = parseInt(s, 10) || 0;
      if (num <= 1) return "00";
      return String(num).padStart(2, "0").slice(-2);
    };
    const listApiMatchedIds = new Set<string>();
    {
      const industryMatchesList = result.industryMatchesList;
      // allPayloads와 industryMatchesList는 동일 순서로 대응
      for (let i = 0; i < allPayloads.length; i++) {
        const iResult = industryMatchesList[i];
        if (!iResult || iResult.matches.length === 0) continue;
        const p = allPayloads[i];
        const key = `${normNo(p.bid_ntce_no)}|${normOrdFn(p.bid_ntce_ord)}`;
        const tenderId = fullIdByKey.get(key);
        if (!tenderId) continue;
        listApiMatchedIds.add(tenderId);
        await supabase.from("tender_industries").delete().eq("tender_id", tenderId);
        const rows = iResult.matches.map((m) => ({
          tender_id: tenderId,
          industry_code: m.code,
          match_source: m.match_source,
          raw_value: m.raw_value,
        }));
        await supabase.from("tender_industries").insert(rows);
      }
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("[G2B 목록API 업종] 매칭된 공고:", listApiMatchedIds.size, "건");
    }
    onProgress?.({ phase: "upsert", total: processed, done: processed, message: `목록 API 업종 반영: ${listApiMatchedIds.size}건` });

    // ─── [Phase 1.5] 기초금액 API 기간+페이지 조회 → 이번 수집 건에 반영 (면허제한과 동일 방식) ─────────
    let baseAmtFilled = 0;
    if (process.env.DATA_GO_KR_SERVICE_KEY?.trim()) {
      const allBsisItems: Record<string, unknown>[] = [];
      const BSIS_PAGE_SIZE = 100;
      const BSIS_PAGE_DELAY_MS = 500;
      const maxBsisPages = 50;
      onProgress?.({ phase: "upsert", total: 0, done: 0, message: "기초금액 기간+페이지 조회 중…" });
      for (let pageNo = 1; pageNo <= maxBsisPages; pageNo++) {
        if (pageNo > 1) await new Promise((r) => setTimeout(r, BSIS_PAGE_DELAY_MS));
        try {
          const bsisRes = await getBidPblancListInfoServcBsisAmountByRange({
            inqryBgnDt: range.inqryBgnDt,
            inqryEndDt: range.inqryEndDt,
            pageNo,
            numOfRows: BSIS_PAGE_SIZE,
            inqryDiv: "1",
          });
          const items = extractItems(bsisRes) as Record<string, unknown>[];
          allBsisItems.push(...items);
          onProgress?.({ phase: "upsert", total: allBsisItems.length, done: allBsisItems.length, message: `기초금액 API ${allBsisItems.length}건 수집…` });
          if (items.length < BSIS_PAGE_SIZE) break;
        } catch (e) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[G2B 기초금액] 페이지 조회 실패:", e instanceof Error ? e.message : e);
          }
          break;
        }
      }
      const now = new Date().toISOString();
      const toUpdate: { tenderId: string; base_amt: number }[] = [];
      for (const item of allBsisItems) {
        const no = normNo(item.bidNtceNo ?? item.bid_ntce_no);
        if (!no) continue;
        const ord = normOrdFn(item.bidNtceOrd ?? item.bid_ntce_ord);
        const key = `${no}|${ord}`;
        const tenderId = fullIdByKey.get(key);
        if (!tenderId) continue;
        const amt = getBaseAmtFromRaw(item);
        if (amt == null || amt <= 0) continue;
        toUpdate.push({ tenderId, base_amt: amt });
      }
      const BATCH_SIZE = 20;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(({ tenderId, base_amt }) =>
            supabase.from("tenders").update({ base_amt, updated_at: now }).eq("id", tenderId)
          )
        );
        baseAmtFilled += batch.length;
      }
      onProgress?.({ phase: "upsert", total: processed, done: processed, message: `기초금액 보강 완료: ${baseAmtFilled}건 반영` });
    }

    // ─── [Phase 2] 면허제한 API 14일치 전체 수집 → 공고번호로 DB 직접 조회 매칭 ─────────
    // 이유: 면허 등록일(inqryBgnDt) ≠ 공고 발표일이라 날짜 축이 다름.
    //       14일치를 수집한 뒤, 해당 공고번호로 DB에서 직접 tender_id 조회 → 이전 수집 건도 매칭.

    onProgress?.({ phase: "license", total: 0, done: 0, message: "면허제한 API 수집 시작 전 대기 (3s)…" });
    // 리스트 API 호출 직후 바로 면허 API 호출 시 429 방지용 선딜레이
    await new Promise((r) => setTimeout(r, 3000));

    onProgress?.({ phase: "license", total: 0, done: 0, message: "면허제한 API 14일치 수집 중…" });
    const allLicenseItems: Record<string, unknown>[] = [];
    let licenseApiError: string | undefined;
    try {
      const pad7 = (n: number) => String(n).padStart(2, "0");
      const licEnd = new Date();
      const licStart = new Date();
      licStart.setDate(licStart.getDate() - 14);
      const licBgnDt = `${licStart.getFullYear()}${pad7(licStart.getMonth() + 1)}${pad7(licStart.getDate())}0000`;
      const licEndDt = `${licEnd.getFullYear()}${pad7(licEnd.getMonth() + 1)}${pad7(licEnd.getDate())}2359`;
      // 429 시 최대 2회 재시도 (1s / 3s backoff)
      const fetchLicensePage = async (pageNo: number): Promise<Record<string, unknown>[]> => {
        const delays = [0, 1000, 3000];
        for (let attempt = 0; attempt < delays.length; attempt++) {
          if (delays[attempt] > 0) await new Promise((r) => setTimeout(r, delays[attempt]));
          try {
            const licRes = await getBidPblancListInfoLicenseLimitByRange({
              inqryBgnDt: licBgnDt,
              inqryEndDt: licEndDt,
              pageNo,
              numOfRows: 1000,
            });
            const items = extractItems(licRes);
            if (process.env.NODE_ENV !== "production" && pageNo === 1) {
              const hdr = licRes.response?.header as { resultCode?: string; resultMsg?: string } | undefined;
              console.log("[G2B 면허] page1 resultCode:", hdr?.resultCode, hdr?.resultMsg, "items:", items.length);
            }
            return (items as Record<string, unknown>[]).filter(
              (r) => r && (r.bidNtceNo != null || r.bid_ntce_no != null)
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[G2B 면허] fetchLicensePage 오류:", msg);
            if (msg.includes("429") && attempt < delays.length - 1) continue;
            throw err;
          }
        }
        return [];
      };
      const LICENSE_PAGE_DELAY_MS = 500;
      for (let licPage = 1; licPage <= 100; licPage++) {
        if (licPage > 1) await new Promise((r) => setTimeout(r, LICENSE_PAGE_DELAY_MS));
        const rows = await fetchLicensePage(licPage);
        allLicenseItems.push(...rows);
        onProgress?.({ phase: "license", done: allLicenseItems.length, message: `면허제한 API 14일치 ${allLicenseItems.length}건 수집 중…` });
        if (rows.length < 1000) break;
      }
    } catch (e) {
      licenseApiError = e instanceof Error ? e.message : String(e);
      onProgress?.({ phase: "license", message: `면허제한 API 수집 실패: ${licenseApiError}` });
      console.error("[G2B 면허] 수집 실패:", licenseApiError);
    }

    // 공고번호(bidNtceNo) 기준으로 면허 데이터 그룹핑 (차수 무시 → 포맷 불일치 해소)
    const licenseByNo = new Map<string, Record<string, unknown>[]>();
    for (const row of allLicenseItems) {
      const no = normNo(row.bidNtceNo ?? row.bid_ntce_no);
      if (!no) continue;
      const arr = licenseByNo.get(no) ?? [];
      arr.push(row);
      licenseByNo.set(no, arr);
    }

    // 공고번호 → tender_id 맵
    // 1) 이번 수집 결과 (fullIdByKey)
    const idByNo = new Map<string, string>();
    for (const [key, tenderId] of fullIdByKey) {
      const no = key.split("|")[0];
      if (no) idByNo.set(no, tenderId);
    }
    // 2) 면허 API 반환 공고번호로 DB 직접 조회 (이전 수집 건 + 공고번호 포맷 불일치 보완)
    if (allLicenseItems.length > 0) {
      const rawNos = [...new Set(
        allLicenseItems.map(r => String(r.bidNtceNo ?? r.bid_ntce_no ?? "").trim()).filter(Boolean)
      )];
      // DB bid_ntce_no 포맷 변형도 함께 검색 (-000 붙은 버전 / 없는 버전)
      const queryNos = [...new Set([
        ...rawNos,
        ...rawNos.map(n => n.replace(/-000$/i, "")),
        ...rawNos.filter(n => !/-000$/i.test(n)).map(n => n + "-000"),
      ])].filter(Boolean);
      const { data: dbRows } = await supabase
        .from("tenders")
        .select("id, bid_ntce_no")
        .in("bid_ntce_no", queryNos);
      for (const row of dbRows ?? []) {
        const no = normNo(row.bid_ntce_no);
        if (no && !idByNo.has(no)) idByNo.set(no, row.id);
      }
      if (process.env.NODE_ENV !== "production") {
        console.log("[G2B 면허] DB 조회:", queryNos.length, "개 변형 → 매칭 후보", (dbRows ?? []).length, "건");
      }
    }

    const matchedTenderIds = new Set<string>();
    const matchedLicenseKeys: string[] = [];

    for (const [no, items] of licenseByNo) {
      const tenderId = idByNo.get(no);
      if (!tenderId) continue;
      const fakeRes = { response: { body: { items: { item: items } } } } as Record<string, unknown>;
      const matches = parseIndustryRestrictionsFromDetailResponse(fakeRes, industries);
      if (matches.length > 0) {
        matchedTenderIds.add(tenderId);
        matchedLicenseKeys.push(no);
        await supabase.from("tender_industries").delete().eq("tender_id", tenderId);
        await supabase.from("tender_industries").insert(
          matches.map((m) => ({
            tender_id: tenderId,
            industry_code: m.code,
            match_source: m.match_source,
            raw_value: m.raw_value,
          }))
        );
        const primary = pickPrimaryIndustryCode(matches.map((x) => x.code), industries);
        await supabase
          .from("tenders")
          .update({
            primary_industry_code: primary ?? null,
            industry_match_status: "matched",
            industry_name_raw: matches.slice(0, 3).map((m) => m.raw_value).join(" / "),
            updated_at: now,
          })
          .eq("id", tenderId);
      }
    }

    // ─── [Phase 3] 나라장터검색조건 용역조회(ServcPPSSrch) → 업종관리(DB)의 활성 업종별 매칭 ───
    // industries 테이블 is_active=true 인 업종 전체에 대해 API 호출 → tender_industries에 추가(기존 행 유지)
    const ppssrchMatchedIds = new Set<string>();
    onProgress?.({ phase: "license", message: "업종별 PPSSrch API 조회 중…" });
    for (const { code, name } of industries) {
      try {
        const ppItems: Record<string, unknown>[] = [];
        let ppPage = 1;
        for (;;) {
          const ppRes = await getBidPblancListInfoServcPPSSrch({
            inqryDiv: "1",
            inqryBgnDt: range.inqryBgnDt,
            inqryEndDt: range.inqryEndDt,
            pageNo: ppPage,
            numOfRows: NUM_OF_ROWS,
            indstrytyCd: code,
            indstrytyNm: name,
          });
          const items = extractItems(ppRes);
          const list = Array.isArray(items) ? items : [items];
          const typed = list.filter((x): x is Record<string, unknown> => x != null && typeof x === "object") as Record<string, unknown>[];
          ppItems.push(...typed);
          const body = ppRes.response?.body as { totalCount?: number } | undefined;
          const total = typeof body?.totalCount === "number" ? body.totalCount : parseInt(String(body?.totalCount ?? "0"), 10) || 0;
          if (typed.length < NUM_OF_ROWS || ppItems.length >= total) break;
          ppPage += 1;
          if (ppPage > 50) break;
          await new Promise((r) => setTimeout(r, 300));
        }
        const ppNos = [...new Set(ppItems.map((r) => normNo(r.bidNtceNo ?? r.bid_ntce_no)).filter(Boolean))];
        if (ppNos.length > 0) {
          const missing = ppNos.filter((no) => !idByNo.has(no));
          if (missing.length > 0) {
            const queryNos = [...new Set([
              ...missing,
              ...missing.map((n) => n.replace(/-000$/i, "")),
              ...missing.filter((n) => !/-000$/i.test(n)).map((n) => n + "-000"),
            ])].filter(Boolean);
            const { data: dbRows } = await supabase.from("tenders").select("id, bid_ntce_no").in("bid_ntce_no", queryNos);
            for (const row of dbRows ?? []) {
              const no = normNo(row.bid_ntce_no);
              if (no && !idByNo.has(no)) idByNo.set(no, row.id);
            }
          }
          const seenTenderIds = new Set<string>();
          const toUpsert: { tender_id: string; industry_code: string; match_source: string; raw_value: string }[] = [];
          for (const item of ppItems) {
            const no = normNo(item.bidNtceNo ?? item.bid_ntce_no);
            const tenderId = idByNo.get(no);
            if (!tenderId || seenTenderIds.has(tenderId)) continue;
            seenTenderIds.add(tenderId);
            ppssrchMatchedIds.add(tenderId);
            toUpsert.push({
              tender_id: tenderId,
              industry_code: code,
              match_source: "servc_ppssrch",
              raw_value: name,
            });
          }
          if (toUpsert.length > 0) {
            await supabase.from("tender_industries").upsert(toUpsert, {
              onConflict: "tender_id,industry_code",
              ignoreDuplicates: false,
            });
            const tenderIds = [...seenTenderIds];
            await supabase.from("tenders").update({
              industry_match_status: "matched",
              industry_name_raw: name,
              updated_at: now,
            }).in("id", tenderIds);
            await supabase.from("tenders").update({
              primary_industry_code: code,
              updated_at: now,
            }).in("id", tenderIds).is("primary_industry_code", null);
          }
        }
      } catch (e) {
        console.error("[G2B PPSSrch]", code, name, e);
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    const allCollectedIds = [...fullIdByKey.values()];
    // listApiMatchedIds, ppssrchMatchedIds: 업종 확인된 건 → cleanup에서 제외 (데이터 보존)
    const unmatchedIds = allCollectedIds.filter(
      (id) => !matchedTenderIds.has(id) && !listApiMatchedIds.has(id) && !ppssrchMatchedIds.has(id)
    );
    if (unmatchedIds.length > 0) {
      const UNMATCHED_BATCH = 100;
      for (let u = 0; u < unmatchedIds.length; u += UNMATCHED_BATCH) {
        const batch = unmatchedIds.slice(u, u + UNMATCHED_BATCH);
        await supabase.from("tender_industries").delete().in("tender_id", batch);
        await supabase
          .from("tenders")
          .update({
            primary_industry_code: null,
            industry_match_status: null,
            industry_name_raw: null,
            updated_at: now,
          })
          .in("id", batch);
      }
    }
    const matchedCount = matchedTenderIds.size;
    onProgress?.({ phase: "upsert", total: processed, done: processed, message: `수집 완료 (면허제한 매칭 ${matchedCount}건 업종 반영)` });

    const bgnDate = `${range.inqryBgnDt.slice(0, 4)}-${range.inqryBgnDt.slice(4, 6)}-${range.inqryBgnDt.slice(6, 8)}`;
    const endDate = `${range.inqryEndDt.slice(0, 4)}-${range.inqryEndDt.slice(4, 6)}-${range.inqryEndDt.slice(6, 8)}`;
    await supabase.from("g2b_fetch_checkpoints").upsert(
      { operation: "tender_list", inqry_bgn_dt: bgnDate, inqry_end_dt: endDate, last_fetched_at: new Date().toISOString() },
      { onConflict: "operation,inqry_bgn_dt,inqry_end_dt" }
    );
    const licenseKeys = [...licenseByNo.keys()];
    const listKeys = [...idByNo.keys()];
    if (process.env.NODE_ENV !== "production") {
      console.log("[G2B 면허] 14일치 원본", allLicenseItems.length, "건, 고유 공고번호", licenseKeys.length, "건, 매칭 반영", matchedLicenseKeys.length, "건");
      const inList = new Set(listKeys);
      const onlyLicense = licenseKeys.filter((k) => !inList.has(k)).slice(0, 3);
      const onlyList = listKeys.filter((k) => !new Set(licenseKeys).has(k)).slice(0, 3);
      if (onlyLicense.length) console.log("[G2B] 면허에만 있는 공고번호 샘플:", onlyLicense);
      if (onlyList.length) console.log("[G2B] 목록에만 있는 공고번호 샘플:", onlyList);
    }
    try {
      const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await supabase.rpc("refresh_tender_daily_aggregate", { p_day_kst: kstDate });
    } catch {
      // 집계 갱신 실패는 수집 성공을 막지 않는다.
    }
    return {
      ok: true,
      tenders: processed,
      inserted: processed,
      updated: 0,
      licenseReflected: matchedTenderIds.size,
      listApiMatchedCount: listApiMatchedIds.size,
      ppssrchMatchedCount: ppssrchMatchedIds.size,
      licenseRawCount: allLicenseItems.length,
      licenseError: licenseApiError,
      licenseKeys,
      matchedLicenseKeys,
      listKeys,
      baseAmtFilled,
    };
  } catch (
    e: unknown
  ) {
    let message: string;
    if (e instanceof Error) {
      message = e.message || String(e);
    } else if (e != null && typeof (e as { message?: string }).message === "string") {
      message = (e as { message: string }).message;
    } else {
      message = String(e);
    }
    if (!message.trim()) message = "알 수 없는 오류";
    return { ok: false, tenders: 0, inserted: 0, updated: 0, licenseReflected: 0, licenseRawCount: 0, ppssrchMatchedCount: 0, error: message, licenseKeys: undefined, matchedLicenseKeys: undefined, listKeys: undefined, baseAmtFilled: undefined };
  }
}
