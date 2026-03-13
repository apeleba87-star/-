/**
 * 나라장터 입찰 목록 수집 → tenders 테이블 upsert + tender_industries 매핑
 * 업종: raw에서 추출해 industries와 매칭. categories는 fallback 유지.
 */

import { createClient } from "@/lib/supabase-server";
import {
  getBidPblancListInfoServc,
  getBidPblancListInfoCnstwk,
  getBidPblancListInfoThng,
  getBidPblancListInfoLicenseLimit,
  getBidPblancListInfoLicenseLimitByRange,
  extractItems,
} from "./client";
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
import { parseRegionSidoList } from "@/lib/tender-utils";

function getSupabase() {
  return createClient();
}

const DEFAULT_KEYWORDS = [
  "청소", "미화", "위생", "시설관리", "환경미화", "건물청소", "소독", "방역", "용역청소",
];

function getDateRange(daysBack = 1): { inqryBgnDt: string; inqryEndDt: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const toYmdHm = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
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

const OPERATION_LABEL: Record<string, string> = { Servc: "용역", Cnstwk: "공사", Thng: "물품" };

const EMPTY_KEYWORD_OPTIONS: CategoryKeywordOptions = {
  cleaning: { includeKeywords: [], excludeKeywords: [] },
  disinfection: { includeKeywords: [], excludeKeywords: [] },
  globalExclude: [],
};

async function fetchOperation(
  operation: "Servc" | "Cnstwk" | "Thng",
  range: { inqryBgnDt: string; inqryEndDt: string },
  allIncludeKeywords: string[],
  optionsByCategory: { cleaning: { includeKeywords: string[]; excludeKeywords: string[] }; disinfection: { includeKeywords: string[]; excludeKeywords: string[] }; globalExclude: string[] },
  industries: IndustryRow[],
  onProgress?: (p: FetchProgress) => void
): Promise<{ payloads: Record<string, unknown>[]; industryMatchesList: IndustryMatchResult[] }> {
  const fetcher =
    operation === "Servc"
      ? getBidPblancListInfoServc
      : operation === "Cnstwk"
        ? getBidPblancListInfoCnstwk
        : getBidPblancListInfoThng;
  const label = OPERATION_LABEL[operation] ?? operation;
  const allItems: Record<string, unknown>[] = [];
  let pageNo = 1;
  for (;;) {
    const data = await fetcher({
      ...range,
      pageNo,
      numOfRows: NUM_OF_ROWS,
    });
    const items = extractItems(data);
    const list = Array.isArray(items) ? items : [items];
    allItems.push(...(list as Record<string, unknown>[]));
    onProgress?.({ phase: "fetch", done: allItems.length, message: `${label} API 수집 중… ${allItems.length}건` });
    if (list.length < NUM_OF_ROWS) break;
    pageNo += 1;
    if (pageNo > 50) break;
  }

  const payloads: Record<string, unknown>[] = [];
  const industryMatchesList: IndustryMatchResult[] = [];
  for (const item of allItems) {
    const raw = item as Record<string, unknown>;
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

    const matchResult = extractIndustryMatchesFromRaw(raw, industries);
    industryMatchesList.push(matchResult);
    const codes = matchResult.matches.map((m) => m.code);
    (mapped as Record<string, unknown>).primary_industry_code = pickPrimaryIndustryCode(codes, industries) ?? null;
    (mapped as Record<string, unknown>).industry_match_status = matchResult.match_status;
    (mapped as Record<string, unknown>).industry_name_raw =
      matchResult.raw_values.length > 0 ? matchResult.raw_values.slice(0, 3).join(" / ") : null;
    const regionText = [raw.bsnsDstrNm, raw.bsns_dstr_nm, raw.ntceInsttNm, raw.ntce_instt_nm].filter(Boolean).join(" ");
    (mapped as Record<string, unknown>).region_sido_list = parseRegionSidoList(regionText || undefined);

    const payload = mapped as Record<string, unknown>;
    const { source: _s, ...rest } = payload;
    payloads.push(rest);
  }
  return { payloads, industryMatchesList };
}

export async function runTenderFetch(options?: {
  daysBack?: number;
  onProgress?: (p: FetchProgress) => void;
}): Promise<{
  ok: boolean;
  tenders: number;
  inserted: number;
  updated: number;
  licenseReflected?: number;
  error?: string;
}> {
  const range = getDateRange(options?.daysBack ?? 1);
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

    const results = await Promise.all(
      (["Servc"] as const).map((op) =>
        fetchOperation(op, range, includeForMatch, byCategory, industries, onProgress)
      )
    );
    const allPayloads = results.flatMap((r) => r.payloads);
    const allIndustryMatches = results.flatMap((r) => r.industryMatchesList);
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
      const normOrd = (v: unknown) => String(v ?? "00").replace(/\D/g, "").padStart(2, "0");
      for (const row of upserted ?? []) {
        const k = `${row.bid_ntce_no}|${normOrd(row.bid_ntce_ord)}`;
        idByKey.set(k, row.id);
        fullIdByKey.set(k, row.id);
        batchIds.push(row.id);
      }

      if (batchIds.length > 0) {
        const { data: existingRows } = await supabase
          .from("tender_industries")
          .select("tender_id, industry_code")
          .in("tender_id", batchIds);
        const existingByTender = new Map<string, Set<string>>();
        for (const r of existingRows ?? []) {
          let set = existingByTender.get(r.tender_id);
          if (!set) {
            set = new Set();
            existingByTender.set(r.tender_id, set);
          }
          set.add(r.industry_code);
        }

        for (let j = 0; j < batch.length; j++) {
          const row = batch[j] as { bid_ntce_no?: string; bid_ntce_ord?: string };
          const key = `${row.bid_ntce_no}|${normOrd(row.bid_ntce_ord)}`;
          const tenderId = idByKey.get(key);
          if (!tenderId) continue;
          const matchResult = allIndustryMatches[i + j];
          const newMatches = matchResult?.matches ?? [];
          const newCodeSet = new Set(newMatches.map((m) => m.code));
          const existing = existingByTender.get(tenderId) ?? new Set<string>();
          const toDelete = [...existing].filter((c) => !newCodeSet.has(c));
          const toAdd = newMatches.filter((m) => !existing.has(m.code));
          if (toDelete.length > 0) {
            await supabase
              .from("tender_industries")
              .delete()
              .eq("tender_id", tenderId)
              .in("industry_code", toDelete);
          }
          if (toAdd.length > 0) {
            await supabase.from("tender_industries").insert(
              toAdd.map((m) => ({
                tender_id: tenderId,
                industry_code: m.code,
                match_source: m.match_source,
                raw_value: m.raw_value,
              }))
            );
          }
        }
      }

      processed += batch.length;
      onProgress?.({ phase: "upsert", total, done: processed, message: `저장 완료 (${processed}/${total}건)…` });
    }

    onProgress?.({ phase: "license", total: processed, done: 0, message: "면허제한 API 기간 조회 중…" });
    const allLicenseItems: Record<string, unknown>[] = [];
    try {
      let licensePageNo = 1;
      const licenseNumOfRows = 1000;
      for (;;) {
        const licenseRes = await getBidPblancListInfoLicenseLimitByRange({
          inqryBgnDt: range.inqryBgnDt,
          inqryEndDt: range.inqryEndDt,
          pageNo: licensePageNo,
          numOfRows: licenseNumOfRows,
        });
        const items = extractItems(licenseRes);
        const list = Array.isArray(items) ? items : [items];
        const rows = (list as Record<string, unknown>[]).filter((r) => r && (r.bidNtceNo != null || r.bid_ntce_no != null));
        allLicenseItems.push(...rows);
        if (rows.length < licenseNumOfRows) break;
        licensePageNo += 1;
        if (licensePageNo > 50) break;
      }
    } catch {
      // 기간 조회 실패 시 raw 기반 업종 유지
    }

    const licenseByKey = new Map<string, Record<string, unknown>[]>();
    for (const row of allLicenseItems) {
      const no = String(row.bidNtceNo ?? row.bid_ntce_no ?? "").trim();
      const ord = String(row.bidNtceOrd ?? row.bid_ntce_ord ?? "00").replace(/\D/g, "").padStart(2, "0");
      if (!no) continue;
      const key = `${no}|${ord}`;
      let arr = licenseByKey.get(key);
      if (!arr) {
        arr = [];
        licenseByKey.set(key, arr);
      }
      arr.push(row);
    }

    // 기간 조회가 0건이면 공고별 면허제한 API 호출(소수 병렬 + 배치 간 대기로 429 방지)
    const LICENSE_FALLBACK_MAX = 300;
    const LICENSE_PARALLEL = 5;
    const LICENSE_BATCH_DELAY_MS = 1200;
    if (licenseByKey.size === 0 && fullIdByKey.size > 0) {
      const entries = [...fullIdByKey.entries()].slice(0, LICENSE_FALLBACK_MAX);
      for (let k = 0; k < entries.length; k += LICENSE_PARALLEL) {
        if (k > 0) await new Promise((r) => setTimeout(r, LICENSE_BATCH_DELAY_MS));
        const batch = entries.slice(k, k + LICENSE_PARALLEL);
        onProgress?.({ phase: "license", total: entries.length, done: k, message: `면허제한 API 공고별 조회 (${k + 1}~${Math.min(k + LICENSE_PARALLEL, entries.length)}/${entries.length})…` });
        const results = await Promise.allSettled(
          batch.map(async ([key, _tenderId]) => {
            const [no, ord] = key.split("|");
            const res = await getBidPblancListInfoLicenseLimit({ bidNtceNo: no, bidNtceOrd: ord ?? "00" });
            const items = extractItems(res);
            const list = Array.isArray(items) ? items : [items];
            const rows = (list as Record<string, unknown>[]).filter((r) => r && typeof r === "object");
            return { key, items: rows };
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.items.length > 0) licenseByKey.set(r.value.key, r.value.items);
        }
      }
    }

    for (const [key, items] of licenseByKey) {
      const tenderId = fullIdByKey.get(key);
      if (!tenderId) continue;
      const fakeResponse = { response: { body: { items: { item: items } } } } as Record<string, unknown>;
      const licenseMatches = parseIndustryRestrictionsFromDetailResponse(fakeResponse, industries);
      if (licenseMatches.length > 0) {
        await supabase.from("tender_industries").delete().eq("tender_id", tenderId);
        await supabase.from("tender_industries").insert(
          licenseMatches.map((m) => ({
            tender_id: tenderId,
            industry_code: m.code,
            match_source: m.match_source,
            raw_value: m.raw_value,
          }))
        );
        const primary = pickPrimaryIndustryCode(licenseMatches.map((x) => x.code), industries);
        await supabase
          .from("tenders")
          .update({
            primary_industry_code: primary ?? null,
            industry_match_status: "matched",
            industry_name_raw: licenseMatches.slice(0, 3).map((m) => m.raw_value).join(" / "),
            updated_at: now,
          })
          .eq("id", tenderId);
      }
      const toSaveRaw = { response: { body: { items: { item: items } } } };
      await supabase
        .from("tender_details")
        .upsert({ tender_id: tenderId, raw: toSaveRaw, updated_at: now }, { onConflict: "tender_id" });
    }
    onProgress?.({ phase: "upsert", total: processed, done: processed, message: `수집 완료 (면허제한 ${licenseByKey.size}건 반영)` });

    const bgnDate = `${range.inqryBgnDt.slice(0, 4)}-${range.inqryBgnDt.slice(4, 6)}-${range.inqryBgnDt.slice(6, 8)}`;
    const endDate = `${range.inqryEndDt.slice(0, 4)}-${range.inqryEndDt.slice(4, 6)}-${range.inqryEndDt.slice(6, 8)}`;
    await supabase.from("g2b_fetch_checkpoints").upsert(
      { operation: "tender_list", inqry_bgn_dt: bgnDate, inqry_end_dt: endDate, last_fetched_at: new Date().toISOString() },
      { onConflict: "operation,inqry_bgn_dt,inqry_end_dt" }
    );
    return { ok: true, tenders: processed, inserted: processed, updated: 0, licenseReflected: licenseByKey.size };
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
    return { ok: false, tenders: 0, inserted: 0, updated: 0, licenseReflected: 0, error: message };
  }
}
