/**
 * 나라장터 입찰 목록 수집 → tenders 테이블 upsert
 * 청소 키워드 필터 적용
 */

import { createClient } from "@/lib/supabase-server";
import {
  getBidPblancListInfoServc,
  getBidPblancListInfoCnstwk,
  getBidPblancListInfoThng,
  extractItems,
} from "./client";
import { mapItemToTender, matchKeywords } from "./mapper";
import { computeCategoryScores } from "./clean-score";
import { getTenderKeywordOptionsByCategory } from "./keywords";

function getSupabase() {
  return createClient();
}

const DEFAULT_KEYWORDS = [
  "청소", "미화", "위생", "시설관리", "환경미화", "건물청소", "소독", "방역", "용역청소",
];

function getDateRange(daysBack = 1): { inqryBgnDt: string; inqryEndDt: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toYmdHm = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  return {
    inqryBgnDt: toYmdHm(start),
    inqryEndDt: toYmdHm(end),
  };
}

async function fetchAndUpsert(
  operation: "Servc" | "Cnstwk" | "Thng",
  params: { inqryBgnDt: string; inqryEndDt: string; pageNo: number; numOfRows: number },
  allIncludeKeywords: string[],
  optionsByCategory: { cleaning: { includeKeywords: string[]; excludeKeywords: string[] }; disinfection: { includeKeywords: string[]; excludeKeywords: string[] }; globalExclude: string[] }
): Promise<{ inserted: number; updated: number }> {
  const fetcher =
    operation === "Servc"
      ? getBidPblancListInfoServc
      : operation === "Cnstwk"
        ? getBidPblancListInfoCnstwk
        : getBidPblancListInfoThng;
  const data = await fetcher(params);
  const items = extractItems(data);
  const supabase = getSupabase();
  let useSource = true;
  let inserted = 0;
  let updated = 0;

  for (const item of items) {
    const mapped = mapItemToTender(item as Record<string, unknown>);
    const title = String(mapped.bid_ntce_nm ?? "");
    const matched = matchKeywords(title, allIncludeKeywords);
    (mapped as Record<string, unknown>).keywords_matched = matched.length > 0 ? matched : null;

    const raw = item as Record<string, unknown>;
    const detailText = [raw.bidNtceDtl, raw.prcureObjDtl, raw.ntceSpecDocCn].filter(Boolean).join(" ");
    const categories = computeCategoryScores(title, detailText || undefined, optionsByCategory);
    (mapped as Record<string, unknown>).categories = categories;
    (mapped as Record<string, unknown>).is_clean_related = categories.includes("cleaning");
    (mapped as Record<string, unknown>).clean_score = categories.length ? 50 : 0;
    (mapped as Record<string, unknown>).clean_reason = { categories };
    (mapped as Record<string, unknown>).manual_override = false;
    (mapped as Record<string, unknown>).manual_tag = null;

    let payload = mapped as Record<string, unknown>;
    let conflictCols = "source,bid_ntce_no,bid_ntce_ord";
    if (!useSource) {
      const { source: _, ...rest } = payload;
      payload = rest;
      conflictCols = "bid_ntce_no,bid_ntce_ord";
    }

    const { error } = await supabase.from("tenders").upsert(payload, {
      onConflict: conflictCols,
      ignoreDuplicates: false,
    });
    if (error) {
      if (error.code === "23505") updated++;
      else if (useSource && /source|column.*exist/i.test(error.message)) {
        useSource = false;
        const { source: __, ...rest } = (mapped as Record<string, unknown>);
        const retry = await supabase.from("tenders").upsert(rest, {
          onConflict: "bid_ntce_no,bid_ntce_ord",
          ignoreDuplicates: false,
        });
        if (retry.error) {
          if (retry.error.code === "23505") updated++;
          else throw retry.error;
        } else inserted++;
      } else throw error;
    } else inserted++;
  }
  return { inserted, updated };
}

export async function runTenderFetch(options?: { daysBack?: number }): Promise<{
  ok: boolean;
  tenders: number;
  inserted: number;
  updated: number;
  error?: string;
}> {
  const range = getDateRange(options?.daysBack ?? 1);
  const byCategory = await getTenderKeywordOptionsByCategory();
  const allInclude = [...byCategory.cleaning.includeKeywords, ...byCategory.disinfection.includeKeywords];
  const includeForMatch = allInclude.length ? allInclude : DEFAULT_KEYWORDS;
  let inserted = 0;
  let updated = 0;
  try {
    for (const op of ["Servc", "Cnstwk", "Thng"] as const) {
      const result = await fetchAndUpsert(
        op,
        {
          ...range,
          pageNo: 1,
          numOfRows: 100,
        },
        includeForMatch,
        byCategory
      );
      inserted += result.inserted;
      updated += result.updated;
    }
    const bgnDate = `${range.inqryBgnDt.slice(0, 4)}-${range.inqryBgnDt.slice(4, 6)}-${range.inqryBgnDt.slice(6, 8)}`;
    const endDate = `${range.inqryEndDt.slice(0, 4)}-${range.inqryEndDt.slice(4, 6)}-${range.inqryEndDt.slice(6, 8)}`;
    const supabase = getSupabase();
    await supabase.from("g2b_fetch_checkpoints").upsert(
      { operation: "tender_list", inqry_bgn_dt: bgnDate, inqry_end_dt: endDate, last_fetched_at: new Date().toISOString() },
      { onConflict: "operation,inqry_bgn_dt,inqry_end_dt" }
    );
    return { ok: true, tenders: inserted + updated, inserted, updated };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, tenders: 0, inserted: 0, updated: 0, error: message };
  }
}
