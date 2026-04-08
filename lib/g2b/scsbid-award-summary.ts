/**
 * Scsbid raw item → tender_award_summaries 행. tender_id는 배치로 tenders와 매칭.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getBaseAmtFromRaw } from "@/lib/tender-utils";
import { scsbidAwardSourceRecordId, scsbidGetFromRow } from "./scsbid-award-ids";

export type ScsbidRawBatchItem = {
  source_slug: string;
  source_record_id: string;
  payload: Record<string, unknown>;
  categories: string[];
  is_clean_related: boolean;
};

function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

/** tenders.bid_ntce_ord와 Scsbid 차수 문자열 매칭용 확장 키 */
export function expandBidNtceOrdKeys(dbOrd: string): string[] {
  const s = String(dbOrd ?? "").trim();
  const digits = s.replace(/\D/g, "") || "0";
  const v3 = digits.padStart(3, "0").slice(-3);
  const n = parseInt(v3, 10);
  const v2 = Number.isNaN(n) ? "00" : String(n).padStart(2, "0");
  return [...new Set([s, digits, v3, v2, v3.slice(-2)])];
}

function parseIsoFromYmdHm(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const num = s.replace(/\D/g, "");
  if (num.length >= 8) {
    const y = num.slice(0, 4);
    const m = num.slice(4, 6);
    const d = num.slice(6, 8);
    const rest =
      num.length >= 14 ? `T${num.slice(8, 10)}:${num.slice(10, 12)}:${num.slice(12, 14)}` : "";
    return `${y}-${m}-${d}${rest ? rest + "Z" : ""}`;
  }
  return null;
}

const MAX_RAW_WALK_DEPTH = 6;

/** XML/JSON 필드명이 문서와 다를 때 잎 노드에서 개찰·낙찰자·예정가 후보 스캔 */
function walkScalarLeaves(
  obj: unknown,
  visit: (path: string, value: unknown) => void,
  path = "",
  depth = 0
): void {
  if (depth > MAX_RAW_WALK_DEPTH || obj == null) return;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walkScalarLeaves(item, visit, `${path}[${i}]`, depth + 1));
    return;
  }
  if (typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = path ? `${path}.${k}` : k;
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      walkScalarLeaves(v, visit, p, depth + 1);
    } else {
      visit(p, v);
    }
  }
}

function scanPayloadForOpengDt(raw: Record<string, unknown>): string | null {
  let best: string | null = null;
  walkScalarLeaves(raw, (path, v) => {
    if (!/(openg|개찰|openresult|scrutin|open.*dt)/i.test(path)) return;
    if (/(bidntce|공고명|ntceord|clsfc|분류번호|rbid)/i.test(path)) return;
    const iso = parseIsoFromYmdHm(v);
    if (iso) best = iso;
  });
  return best;
}

function scanPayloadForBidderNm(raw: Record<string, unknown>): string | null {
  let priority: string | null = null;
  let fallback: string | null = null;
  walkScalarLeaves(raw, (path, v) => {
    if (v == null) return;
    if (typeof v !== "string" && typeof v !== "number") return;
    if (!/(낙찰|sucs|win|bidwin|fnl|corp|업체|prtcpt|성공)/i.test(path)) return;
    if (/(amt|prce|cnt|cnum|num|rate|per|dt|ord|no|mthd|div|ty|type|cd|code)/i.test(path)) return;
    if (/(ntce|공고|bidntce|clsfc|plnprc|presmpt|bss)/i.test(path)) return;
    const s = String(v).trim();
    if (s.length < 2 || s.length > 200) return;
    if (/^\d[\d\s,-]*$/.test(s)) return;
    if (/(낙찰자|sucsfbider|fnl.*corp|bidwin)/i.test(path)) priority = s;
    else if (!fallback) fallback = s;
  });
  return priority ?? fallback;
}

function scanPayloadForPresmptPrce(raw: Record<string, unknown>): number | null {
  let strong: number | null = null;
  let weak: number | null = null;
  walkScalarLeaves(raw, (path, v) => {
    if (!/(presmpt|plnprc|bss|bsis|estmt|bdgt|예정|추정|기초|예산|totbss|rsrvtn)/i.test(path)) return;
    if (/(rate|per|mthd|nm|dt|ord|cnt|sucs|낙찰|win|fnl)/i.test(path)) return;
    const n = parseNum(v);
    if (n == null || n < 1_000) return;
    const rounded = Math.round(n);
    if (/presmpt|plnprc|예정가/i.test(path)) strong = rounded;
    else if (weak == null) weak = rounded;
  });
  return strong ?? weak;
}

export type TenderAwardSummaryUpsertRow = {
  source_slug: string;
  source_record_id: string;
  tender_id: string | null;
  bid_ntce_no: string;
  bid_ntce_ord: string;
  bid_clsfc_no: string | null;
  rbid_no: string | null;
  bid_ntce_nm: string | null;
  openg_dt: string | null;
  sucsfbider_nm: string | null;
  sucsfbid_amt: number | null;
  presmpt_prce: number | null;
  bid_rate_pct: number | null;
  prtcpt_cnum: number | null;
  rate_band: string | null;
  competition_summary: string | null;
  categories: string[];
  is_clean_related: boolean;
  updated_at: string;
};

function inferRateBand(pct: number | null): string | null {
  if (pct == null || Number.isNaN(pct)) return null;
  if (pct < 85) return "under_85";
  if (pct <= 95) return "85_95";
  return "over_95";
}

function rateBandLabel(band: string | null): string | null {
  if (!band) return null;
  if (band === "under_85") return "낙찰률 85% 미만 구간";
  if (band === "85_95") return "낙찰률 85~95% 구간";
  if (band === "over_95") return "낙찰률 95% 초과 구간";
  return null;
}

function buildCompetitionSummary(prtcpt: number | null): string | null {
  if (prtcpt == null || prtcpt < 1) return null;
  return `유효 참여 ${prtcpt}개사`;
}

/** 낙찰률·구간·경쟁 문구를 현재 금액·참여 필드 기준으로 다시 계산 */
function finalizeAwardSummaryDerived(row: TenderAwardSummaryUpsertRow): void {
  if (
    row.bid_rate_pct == null &&
    row.sucsfbid_amt != null &&
    row.presmpt_prce != null &&
    row.presmpt_prce > 0
  ) {
    row.bid_rate_pct = Math.round((row.sucsfbid_amt / row.presmpt_prce) * 10000) / 100;
  }
  row.rate_band = inferRateBand(row.bid_rate_pct);
  let competition = buildCompetitionSummary(row.prtcpt_cnum);
  const bandText = rateBandLabel(row.rate_band);
  if (bandText) {
    competition = competition ? `${competition} · ${bandText}` : bandText;
  }
  row.competition_summary = competition;
}

/** API 낙찰률(%) 또는 금액 대비 산출 */
function resolveBidRatePct(
  raw: Record<string, unknown>,
  sucsAmt: number | null,
  presmpt: number | null
): number | null {
  const fromApi = parseNum(
    scsbidGetFromRow(raw, [
      "sucsfbidLwstlmtRt",
      "sucsfbidLwtRor",
      "bidPrcePer",
      "bid_prce_per",
      "plnprcPer",
      "낙찰률",
      "낙찰가격비율",
    ])
  );
  if (fromApi != null) {
    const x = fromApi > 0 && fromApi <= 1 ? fromApi * 100 : fromApi;
    if (x >= 0 && x <= 200) return Math.round(x * 100) / 100;
  }
  if (sucsAmt != null && presmpt != null && presmpt > 0) {
    return Math.round((sucsAmt / presmpt) * 10000) / 100;
  }
  return null;
}

export function rawPayloadToAwardSummary(
  raw: Record<string, unknown>,
  meta: {
    source_slug: string;
    source_record_id: string;
    categories: string[];
    is_clean_related: boolean;
    tender_id: string | null;
  }
): TenderAwardSummaryUpsertRow {
  const bidNo = String(scsbidGetFromRow(raw, ["bidNtceNo", "bid_ntce_no"]) ?? "").trim();
  const ordRaw = String(scsbidGetFromRow(raw, ["bidNtceOrd", "bid_ntce_ord"]) ?? "00").replace(/\D/g, "") || "0";
  const ord3 = ordRaw.padStart(3, "0").slice(-3);
  const clsfc = String(scsbidGetFromRow(raw, ["bidClsfcNo", "bid_clsfc_no"]) ?? "").trim() || null;
  const rbid = String(scsbidGetFromRow(raw, ["rbidNo", "rbid_no"]) ?? "0").replace(/\D/g, "") || "0";

  const sucsAmt =
    parseNum(
      scsbidGetFromRow(raw, [
        "sucsfbidAmt",
        "sucsfbid_amt",
        "fnlSucsfBidAmt",
        "bssamt",
        "낙찰금액",
      ])
    ) ?? null;

  const presmpt =
    parseNum(
      scsbidGetFromRow(raw, [
        "presmptPrce",
        "presmpt_prce",
        "plnprc",
        "fnlPresmptPrce",
        "fnl_presmpt_prce",
        "rsrvtnPrce",
        "rsrvtn_prce",
        "totBssamt",
        "tot_bssamt",
        "presmptBssamt",
        "asignBdgtAmt",
        "bdgtAmt",
        "estmtAmt",
        "estmt_amt",
        "bsisAmt",
        "bssamt",
        "예정가격",
        "추정가격",
        "기초금액",
        "예산금액",
        "배정예산금액",
      ])
    ) ?? null;

  const prtcpt = parseNum(
    scsbidGetFromRow(raw, [
      "prtcptCnum",
      "prtcpt_cnum",
      "totlPrtcptNum",
      "totPrtcptNum",
      "validPrtcptNum",
      "유효참여업체수",
      "참여업체수",
      "참가업체수",
    ])
  );
  const prtcptInt = prtcpt != null ? Math.round(prtcpt) : null;

  const openg = parseIsoFromYmdHm(
    scsbidGetFromRow(raw, [
      "opengDt",
      "openg_dt",
      "rOpengDt",
      "r_openg_dt",
      "fnlOpengDt",
      "fnl_openg_dt",
      "opengRsltDt",
      "opengRsltDtm",
      "opengDate",
      "opengYmd",
      "opengTme",
      "scrutinyOpengDt",
      "개찰일시",
      "개찰일자",
      "개찰결과일시",
      "결과일시",
    ])
  );

  let bidder =
    String(
      scsbidGetFromRow(raw, [
        "sucsfbiderNm",
        "sucsfbider_nm",
        "fnlSucsfCorpNm",
        "fnlSucsfbidCorpNm",
        "fnl_sucsf_corp_nm",
        "prtcptCorpNm",
        "prtcpt_corp_nm",
        "bidwinrNm",
        "bidWinrNm",
        "bidwinr_nm",
        "opengCorpNm",
        "openg_corp_nm",
        "opengCorpInfoNm",
        "sucsfbidCorpNm",
        "sucsfbid_corp_nm",
        "bsnsCorpNm",
        "corpNm",
        "corp_nm",
        "낙찰자명",
        "낙찰업체명",
        "낙찰자",
        "개찰업체명",
        "성공낙찰자명",
      ]) ?? ""
    ).trim() || null;

  let opengF = openg;
  let presmptF = presmpt;
  if (!opengF) opengF = scanPayloadForOpengDt(raw);
  if (!bidder) bidder = scanPayloadForBidderNm(raw);
  if (presmptF == null) presmptF = scanPayloadForPresmptPrce(raw);

  const bidRatePct2 = resolveBidRatePct(raw, sucsAmt, presmptF);

  const row: TenderAwardSummaryUpsertRow = {
    source_slug: meta.source_slug,
    source_record_id: meta.source_record_id,
    tender_id: meta.tender_id,
    bid_ntce_no: bidNo,
    bid_ntce_ord: ord3,
    bid_clsfc_no: clsfc,
    rbid_no: rbid === "0" ? null : rbid,
    bid_ntce_nm: String(scsbidGetFromRow(raw, ["bidNtceNm", "bid_ntce_nm"]) ?? "").trim() || null,
    openg_dt: opengF,
    sucsfbider_nm: bidder,
    sucsfbid_amt: sucsAmt != null ? Math.round(sucsAmt) : null,
    presmpt_prce: presmptF != null ? Math.round(presmptF) : null,
    bid_rate_pct: bidRatePct2,
    prtcpt_cnum: prtcptInt && prtcptInt > 0 ? prtcptInt : null,
    rate_band: null,
    competition_summary: null,
    categories: meta.categories,
    is_clean_related: meta.is_clean_related,
    updated_at: new Date().toISOString(),
  };
  finalizeAwardSummaryDerived(row);
  return row;
}

/** bid_ntce_no IN 쿼리 한 번으로 차수 변형 매칭 맵 구축 */
export function buildTenderOrdResolver(
  tenderRows: { id: string; bid_ntce_no: string; bid_ntce_ord: string }[]
): (bidNo: string, ordKeys: string[]) => string | null {
  const byNo = new Map<string, Map<string, string>>();
  for (const t of tenderRows) {
    const no = String(t.bid_ntce_no ?? "").trim();
    if (!no) continue;
    if (!byNo.has(no)) byNo.set(no, new Map());
    const inner = byNo.get(no)!;
    for (const k of expandBidNtceOrdKeys(t.bid_ntce_ord)) {
      inner.set(k, t.id);
    }
  }
  return (bidNo: string, ordKeys: string[]) => {
    const inner = byNo.get(bidNo.trim());
    if (!inner) return null;
    for (const k of ordKeys) {
      const id = inner.get(k);
      if (id) return id;
    }
    return null;
  };
}

async function enrichSummariesFromTenders(
  supabase: SupabaseClient,
  rows: TenderAwardSummaryUpsertRow[]
): Promise<TenderAwardSummaryUpsertRow[]> {
  const tids = [...new Set(rows.map((r) => r.tender_id).filter(Boolean))] as string[];
  if (tids.length === 0) return rows;
  const { data, error } = await supabase
    .from("tenders")
    .select("id,openg_dt,base_amt,estmt_amt,raw")
    .in("id", tids);
  if (error || !data?.length) return rows;
  const byId = new Map(data.map((t) => [String(t.id), t]));
  return rows.map((row) => {
    if (!row.tender_id) return row;
    const t = byId.get(row.tender_id);
    if (!t) return row;
    const next: TenderAwardSummaryUpsertRow = { ...row };
    if (next.openg_dt == null && t.openg_dt) {
      next.openg_dt = String(t.openg_dt);
    }
    if (next.presmpt_prce == null) {
      const base = t.base_amt != null ? Number(t.base_amt) : null;
      const est = t.estmt_amt != null ? Number(t.estmt_amt) : null;
      if (base != null && !Number.isNaN(base) && base > 0) {
        next.presmpt_prce = Math.round(base);
      } else if (est != null && !Number.isNaN(est) && est > 0) {
        next.presmpt_prce = Math.round(est);
      } else {
        const fromRaw = getBaseAmtFromRaw(t.raw);
        if (fromRaw != null && fromRaw > 0) next.presmpt_prce = Math.round(fromRaw);
      }
    }
    const traw = t.raw && typeof t.raw === "object" ? (t.raw as Record<string, unknown>) : null;
    if (traw) {
      if (next.openg_dt == null) {
        next.openg_dt = scanPayloadForOpengDt(traw);
      }
      if (next.sucsfbider_nm == null) {
        next.sucsfbider_nm = scanPayloadForBidderNm(traw);
      }
      if (next.presmpt_prce == null) {
        const w = scanPayloadForPresmptPrce(traw);
        if (w != null) next.presmpt_prce = w;
      }
    }
    finalizeAwardSummaryDerived(next);
    return next;
  });
}

function ordKeysFromApiRaw(raw: Record<string, unknown>): string[] {
  const ordRaw = String(scsbidGetFromRow(raw, ["bidNtceOrd", "bid_ntce_ord"]) ?? "00");
  const digits = ordRaw.replace(/\D/g, "") || "0";
  const v3 = digits.padStart(3, "0").slice(-3);
  const n = parseInt(v3, 10);
  const v2 = Number.isNaN(n) ? "00" : String(n).padStart(2, "0");
  return [...new Set([ordRaw, digits, v3, v2, v3.slice(-2)])];
}

export async function upsertTenderAwardSummaryBatch(
  supabase: SupabaseClient,
  rows: TenderAwardSummaryUpsertRow[]
): Promise<{ error: string | null }> {
  if (rows.length === 0) return { error: null };
  const chunkSize = 150;
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({
      ...r,
      updated_at: r.updated_at || now,
    }));
    const { error } = await supabase.from("tender_award_summaries").upsert(chunk, {
      onConflict: "source_slug,source_record_id",
    });
    if (error) return { error: error.message };
  }
  return { error: null };
}

/**
 * raw 수집 배치와 동일 건에 대해 요약 upsert. tenders는 bid_ntce_no IN으로 한 번 조회.
 */
export async function upsertAwardSummariesForRawBatch(
  supabase: SupabaseClient,
  rawRows: ScsbidRawBatchItem[]
): Promise<{ error: string | null }> {
  if (rawRows.length === 0) return { error: null };

  const bidNos = [
    ...new Set(
      rawRows
        .map((r) => String(scsbidGetFromRow(r.payload, ["bidNtceNo", "bid_ntce_no"]) ?? "").trim())
        .filter(Boolean)
    ),
  ];

  let tenderRows: { id: string; bid_ntce_no: string; bid_ntce_ord: string }[] = [];
  if (bidNos.length > 0) {
    const { data, error } = await supabase
      .from("tenders")
      .select("id,bid_ntce_no,bid_ntce_ord")
      .in("bid_ntce_no", bidNos);
    if (error) return { error: error.message };
    tenderRows = (data ?? []) as { id: string; bid_ntce_no: string; bid_ntce_ord: string }[];
  }

  const resolve = buildTenderOrdResolver(tenderRows);

  const summaries: TenderAwardSummaryUpsertRow[] = [];
  for (const r of rawRows) {
    const id = scsbidAwardSourceRecordId(r.payload);
    if (!id || id !== r.source_record_id) continue;
    const bidNo = String(scsbidGetFromRow(r.payload, ["bidNtceNo", "bid_ntce_no"]) ?? "").trim();
    if (!bidNo) continue;
    const keys = ordKeysFromApiRaw(r.payload);
    const tenderId = resolve(bidNo, keys);
    summaries.push(
      rawPayloadToAwardSummary(r.payload, {
        source_slug: r.source_slug,
        source_record_id: r.source_record_id,
        categories: r.categories,
        is_clean_related: r.is_clean_related,
        tender_id: tenderId,
      })
    );
  }

  const enriched = await enrichSummariesFromTenders(supabase, summaries);
  return upsertTenderAwardSummaryBatch(supabase, enriched);
}
