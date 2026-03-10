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
  phase: "fetch" | "upsert";
  total?: number;
  done?: number;
  message?: string;
};

const OPERATION_LABEL: Record<string, string> = { Servc: "용역", Cnstwk: "공사", Thng: "물품" };

async function fetchOperation(
  operation: "Servc" | "Cnstwk" | "Thng",
  range: { inqryBgnDt: string; inqryEndDt: string },
  allIncludeKeywords: string[],
  optionsByCategory: { cleaning: { includeKeywords: string[]; excludeKeywords: string[] }; disinfection: { includeKeywords: string[]; excludeKeywords: string[] }; globalExclude: string[] },
  onProgress?: (p: FetchProgress) => void
): Promise<Record<string, unknown>[]> {
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
  for (const item of allItems) {
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

    const payload = mapped as Record<string, unknown>;
    const { source: _s, ...rest } = payload;
    payloads.push(rest);
  }
  return payloads;
}

export async function runTenderFetch(options?: {
  daysBack?: number;
  onProgress?: (p: FetchProgress) => void;
}): Promise<{
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
  const onProgress = options?.onProgress;

  try {
    onProgress?.({ phase: "fetch", message: "API 수집 중 (용역)…" });

    const results = await Promise.all(
      (["Servc"] as const).map((op) =>
        fetchOperation(op, range, includeForMatch, byCategory, onProgress)
      )
    );
    const allPayloads = results.flat();
    const total = allPayloads.length;

    onProgress?.({ phase: "upsert", total, done: 0, message: `저장 중 (총 ${total}건)…` });

    const supabase = getSupabase();
    let processed = 0;
    for (let i = 0; i < allPayloads.length; i += BATCH_UPSERT_SIZE) {
      const batch = allPayloads.slice(i, i + BATCH_UPSERT_SIZE);
      const { error } = await supabase.from("tenders").upsert(batch, {
        onConflict: "bid_ntce_no,bid_ntce_ord",
        ignoreDuplicates: false,
      });
      if (error) throw error;
      processed += batch.length;
      onProgress?.({ phase: "upsert", total, done: processed });
    }

    const bgnDate = `${range.inqryBgnDt.slice(0, 4)}-${range.inqryBgnDt.slice(4, 6)}-${range.inqryBgnDt.slice(6, 8)}`;
    const endDate = `${range.inqryEndDt.slice(0, 4)}-${range.inqryEndDt.slice(4, 6)}-${range.inqryEndDt.slice(6, 8)}`;
    await supabase.from("g2b_fetch_checkpoints").upsert(
      { operation: "tender_list", inqry_bgn_dt: bgnDate, inqry_end_dt: endDate, last_fetched_at: new Date().toISOString() },
      { onConflict: "operation,inqry_bgn_dt,inqry_end_dt" }
    );
    return { ok: true, tenders: processed, inserted: processed, updated: 0 };
  } catch (e) {
    let message: string;
    if (e instanceof Error) {
      message = e.message || String(e);
    } else if (e != null && typeof (e as { message?: string }).message === "string") {
      message = (e as { message: string }).message;
    } else {
      message = String(e);
    }
    if (!message.trim()) message = "알 수 없는 오류";
    return { ok: false, tenders: 0, inserted: 0, updated: 0, error: message };
  }
}
