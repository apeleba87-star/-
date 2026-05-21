import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractIndustryMatchesFromRaw,
  pickPrimaryIndustryCode,
  type IndustryRow,
} from "@/lib/g2b/industry-from-raw";
import { parseRegionSidoList } from "@/lib/tender-utils";

const BATCH_SIZE = 100;

export type BackfillTenderIndustriesProgress = {
  processed: number;
  updated: number;
  total: number | null;
  percent: number | null;
  phase: string;
  message: string;
};

export type BackfillTenderIndustriesResult =
  | { ok: true; processed: number; updated: number }
  | { ok: false; error: string; processed: number; updated: number };

type BackfillOptions = {
  force?: boolean;
  /** 지정 시 해당 tender_id만 처리 (낙찰 연동 공고 등) */
  tenderIds?: string[];
  total?: number | null;
  onProgress?: (p: BackfillTenderIndustriesProgress) => void;
};

/**
 * tenders.raw → tender_industries + primary_industry_code 백필
 */
export async function runBackfillTenderIndustries(
  supabase: SupabaseClient,
  industries: IndustryRow[],
  options: BackfillOptions = {},
): Promise<BackfillTenderIndustriesResult> {
  const force = options.force ?? false;
  const tenderIds = options.tenderIds?.length ? [...new Set(options.tenderIds)] : null;
  const total = options.total ?? (tenderIds ? tenderIds.length : null);
  const onProgress = options.onProgress;

  let processed = 0;
  let updated = 0;
  const now = new Date().toISOString();

  if (tenderIds) {
    for (let i = 0; i < tenderIds.length; i += BATCH_SIZE) {
      const batchIds = tenderIds.slice(i, i + BATCH_SIZE);
      const result = await processTenderBatch(supabase, industries, batchIds, now);
      if (!result.ok) return { ok: false, error: result.error, processed, updated };
      processed += result.processed;
      updated += result.updated;
      const percent = total != null && total > 0 ? Math.round((processed / total) * 100) : null;
      onProgress?.({
        processed,
        updated,
        total,
        percent,
        phase: "batch",
        message:
          total != null
            ? `${processed} / ${total}건 (${percent}%) · 업종 매핑 ${updated}건`
            : `배치 ${processed}건 · 업종 매핑 ${updated}건`,
      });
    }
    return { ok: true, processed, updated };
  }

  let from = 0;
  for (;;) {
    let q = supabase
      .from("tenders")
      .select("id, bid_ntce_no, bid_ntce_ord, raw, bsns_dstr_nm, ntce_instt_nm")
      .not("raw", "is", null)
      .order("id", { ascending: true })
      .range(from, from + BATCH_SIZE - 1);
    if (!force) {
      q = q.is("primary_industry_code", null);
    }
    const { data: tenders, error: fetchErr } = await q;
    if (fetchErr) {
      return { ok: false, error: fetchErr.message, processed, updated };
    }
    if (!tenders?.length) break;

    const batchIds = tenders.map((t) => t.id);
    const result = await processTenderBatch(supabase, industries, batchIds, now, tenders);
    if (!result.ok) return { ok: false, error: result.error, processed, updated };
    processed += result.processed;
    updated += result.updated;
    from += BATCH_SIZE;

    const percent = total != null && total > 0 ? Math.round((processed / total) * 100) : null;
    onProgress?.({
      processed,
      updated,
      total,
      percent,
      phase: "batch",
      message:
        total != null
          ? `${processed} / ${total}건 (${percent}%) · 업종 매핑 ${updated}건`
          : `배치 ${processed}건 · 업종 매핑 ${updated}건`,
    });
  }

  return { ok: true, processed, updated };
}

async function processTenderBatch(
  supabase: SupabaseClient,
  industries: IndustryRow[],
  batchIds: string[],
  now: string,
  prefetched?: {
    id: string;
    bid_ntce_no: string;
    bid_ntce_ord: string;
    raw: unknown;
    bsns_dstr_nm: string | null;
    ntce_instt_nm: string | null;
  }[],
): Promise<{ ok: true; processed: number; updated: number } | { ok: false; error: string; processed: number; updated: number }> {
  let tenders = prefetched;
  if (!tenders) {
    const { data, error } = await supabase
      .from("tenders")
      .select("id, bid_ntce_no, bid_ntce_ord, raw, bsns_dstr_nm, ntce_instt_nm")
      .in("id", batchIds);
    if (error) return { ok: false, error: error.message, processed: 0, updated: 0 };
    tenders = data ?? [];
  }

  const extracted = tenders.map((t) => {
    const raw = t.raw as Record<string, unknown> | null;
    const matchResult = extractIndustryMatchesFromRaw(raw ?? undefined, industries);
    return { id: t.id, matchResult, t };
  });

  const deleteRes = await supabase.from("tender_industries").delete().in("tender_id", batchIds);
  if (deleteRes.error) {
    return { ok: false, error: deleteRes.error.message, processed: 0, updated: 0 };
  }

  const insertRows: { tender_id: string; industry_code: string; match_source: string; raw_value: string }[] = [];
  for (const { id, matchResult } of extracted) {
    for (const m of matchResult.matches) {
      insertRows.push({
        tender_id: id,
        industry_code: m.code,
        match_source: m.match_source,
        raw_value: m.raw_value,
      });
    }
  }
  if (insertRows.length > 0) {
    const insertRes = await supabase.from("tender_industries").insert(insertRows);
    if (insertRes.error) {
      return { ok: false, error: insertRes.error.message, processed: 0, updated: 0 };
    }
  }

  let updated = 0;
  for (const { id, matchResult, t } of extracted) {
    const codes = matchResult.matches.map((m) => m.code);
    const primary = pickPrimaryIndustryCode(codes, industries);
    const regionText = [t.bsns_dstr_nm, t.ntce_instt_nm].filter(Boolean).join(" ");
    const region_sido_list = parseRegionSidoList(regionText || undefined);
    const { error: updateErr } = await supabase
      .from("tenders")
      .update({
        primary_industry_code: primary ?? null,
        industry_match_status: matchResult.match_status,
        industry_name_raw: matchResult.raw_values?.length ? matchResult.raw_values.slice(0, 3).join(" / ") : null,
        region_sido_list: region_sido_list.length > 0 ? region_sido_list : [],
        industry_backfilled_at: now,
        updated_at: now,
      })
      .eq("id", id);
    if (updateErr) {
      return { ok: false, error: updateErr.message, processed: tenders.length, updated };
    }
    if (codes.length > 0) updated += 1;
  }

  return { ok: true, processed: tenders.length, updated };
}
