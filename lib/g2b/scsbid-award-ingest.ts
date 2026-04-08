/**
 * ScsbidInfoService 용역 낙찰 목록 → tender_award_raw upsert.
 * 개찰일시(inqryDiv=3) 구간 조회, 입찰 수집과 동일 KST lookback.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { extractItems, type G2BListResponse } from "./client";
import { getScsbidListSttusServc, isScsbidApiHeaderOk } from "./scsbid-client";
import { computeCategoryScores } from "./clean-score";
import type { CategoryKeywordOptions } from "./keywords";
import { scsbidAwardSourceRecordId, scsbidGetFromRow } from "./scsbid-award-ids";
import { upsertAwardSummariesForRawBatch } from "./scsbid-award-summary";
import { SCSBID_AWARD_DEFAULT_LOOKBACK_MINUTES } from "./scsbid-ingest-window";

export const TENDER_AWARD_RAW_SOURCE_SCSBID_LIST_STTUS_SERVC = "scsbid_getScsbidListSttusServc";

/** 입찰 G2B cron과 동일 겹침(분). 환경변수 기본은 `scsbid-ingest-window`. */
export const SCSBID_AWARD_CRON_LOOKBACK_MINUTES = SCSBID_AWARD_DEFAULT_LOOKBACK_MINUTES;

const pad = (n: number) => String(n).padStart(2, "0");
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toYmdHmKst(utcDate: Date): string {
  const kst = new Date(utcDate.getTime() + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}${pad(kst.getUTCHours())}${pad(kst.getUTCMinutes())}`;
}

function getDateRangeLookbackKst(lookbackMs: number): { inqryBgnDt: string; inqryEndDt: string } {
  const now = new Date();
  const endKst = toYmdHmKst(now);
  const startUtc = new Date(now.getTime() - lookbackMs);
  const startKst = toYmdHmKst(startUtc);
  return { inqryBgnDt: startKst, inqryEndDt: endKst };
}

export { scsbidAwardSourceRecordId } from "./scsbid-award-ids";

function detailTextFromAwardRow(row: Record<string, unknown>): string {
  const parts = [
    row.bidNtceDtl,
    row.prcureObjDtl,
    row.ntceSpecDocCn,
    row.bidNtceCntnt,
    row.servcNm,
    row.prcureObjNm,
  ].filter(Boolean);
  return parts.map((p) => String(p)).join(" ");
}

export type TenderAwardRawUpsertRow = {
  source_slug: string;
  source_record_id: string;
  payload: Record<string, unknown>;
  categories: string[];
  is_clean_related: boolean;
  last_fetched_at: string;
};

export async function upsertTenderAwardRawBatch(
  supabase: SupabaseClient,
  rows: TenderAwardRawUpsertRow[]
): Promise<{ error: string | null }> {
  if (rows.length === 0) return { error: null };
  const chunkSize = 150;
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({
      ...r,
      last_fetched_at: r.last_fetched_at || now,
    }));
    const { error } = await supabase.from("tender_award_raw").upsert(chunk, {
      onConflict: "source_slug,source_record_id",
    });
    if (error) return { error: error.message };
  }
  return { error: null };
}

export async function runScsbidAwardRawIngest(opts: {
  supabase: SupabaseClient;
  optionsByCategory: CategoryKeywordOptions;
  lookbackMinutes?: number;
  pageSize?: number;
  maxRowsPerRun?: number;
  inqryDiv?: string;
}): Promise<{
  ok: boolean;
  pages: number;
  rowsWritten: number;
  totalCount: number;
  lastResultCode?: string;
  /** API에 넣은 개찰일시 조회 시작·끝 (KST YYYYMMDDHHmm) */
  inqryBgnDt?: string;
  inqryEndDt?: string;
  error?: string;
}> {
  const lookbackMs = Math.max(1, Math.floor(opts.lookbackMinutes ?? SCSBID_AWARD_CRON_LOOKBACK_MINUTES)) * 60 * 1000;
  const range = getDateRangeLookbackKst(lookbackMs);
  const rangeMeta = { inqryBgnDt: range.inqryBgnDt, inqryEndDt: range.inqryEndDt };
  const numOfRows = Math.min(999, Math.max(1, Math.floor(opts.pageSize ?? 100)));
  const maxRows = Math.max(1, Math.floor(opts.maxRowsPerRun ?? 2500));
  const inqryDiv = opts.inqryDiv ?? "3";

  let pageNo = 1;
  let pages = 0;
  let rowsWritten = 0;
  let totalCount = 0;
  let lastCode = "";

  const optionsByCategory = opts.optionsByCategory;

  for (; pages < 200 && rowsWritten < maxRows; pageNo += 1) {
    const data = await getScsbidListSttusServc({
      ...range,
      pageNo,
      numOfRows,
      inqryDiv,
    });
    pages += 1;

    const header = data.response?.header as { resultCode?: string | number; resultMsg?: string } | undefined;
    lastCode = header?.resultCode != null ? String(header.resultCode) : "";

    if (!isScsbidApiHeaderOk(data)) {
      const msg = header?.resultMsg ?? lastCode;
      return {
        ok: false,
        pages,
        rowsWritten,
        totalCount,
        lastResultCode: lastCode,
        ...rangeMeta,
        error: msg ? `API 오류: ${msg}` : `API resultCode: ${lastCode || "(없음)"}`,
      };
    }

    const body = data.response?.body as { totalCount?: number } | undefined;
    if (typeof body?.totalCount === "number" && body.totalCount >= 0) {
      totalCount = body.totalCount;
    }

    const items = extractItems(data as G2BListResponse<Record<string, unknown>>) as Record<string, unknown>[];
    if (items.length === 0) break;

    const batch: TenderAwardRawUpsertRow[] = [];
    for (const raw of items) {
      if (rowsWritten + batch.length >= maxRows) break;
      const id = scsbidAwardSourceRecordId(raw);
      if (!id) continue;
      const title = String(scsbidGetFromRow(raw, ["bidNtceNm", "bid_ntce_nm"]) ?? "");
      const detail = detailTextFromAwardRow(raw);
      const categories = computeCategoryScores(title, detail || undefined, optionsByCategory);
      batch.push({
        source_slug: TENDER_AWARD_RAW_SOURCE_SCSBID_LIST_STTUS_SERVC,
        source_record_id: id,
        payload: raw,
        categories,
        is_clean_related: categories.includes("cleaning"),
        last_fetched_at: new Date().toISOString(),
      });
    }

    if (batch.length > 0) {
      const { error } = await upsertTenderAwardRawBatch(opts.supabase, batch);
      if (error) {
        return {
          ok: false,
          pages,
          rowsWritten,
          totalCount,
          lastResultCode: lastCode,
          ...rangeMeta,
          error,
        };
      }
      const sumErr = await upsertAwardSummariesForRawBatch(opts.supabase, batch);
      if (sumErr.error) {
        return {
          ok: false,
          pages,
          rowsWritten,
          totalCount,
          lastResultCode: lastCode,
          ...rangeMeta,
          error: sumErr.error,
        };
      }
      rowsWritten += batch.length;
    } else if (items.length > 0) {
      break;
    }

    if (items.length < numOfRows) break;
    if (totalCount > 0 && pageNo * numOfRows >= totalCount) break;
  }

  return { ok: true, pages, rowsWritten, totalCount, lastResultCode: lastCode, ...rangeMeta };
}
