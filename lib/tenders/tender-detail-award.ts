import { expandBidNtceOrdKeys } from "@/lib/g2b/scsbid-award-summary";

export type TenderForAwardBanner = {
  bid_clse_dt: string | null;
  openg_dt: string | null;
  raw: unknown;
};

export type TenderAwardSummaryForDetail = {
  id: string;
  openg_dt: string | null;
  sucsfbider_nm: string | null;
  sucsfbid_amt: number | string | null;
  presmpt_prce: number | string | null;
  bid_rate_pct: number | string | null;
  prtcpt_cnum: number | null;
  competition_summary: string | null;
  rate_band: string | null;
};

function pickRawText(raw: unknown, keys: string[]): string | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  for (const k of keys) {
    const v = r[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function isFutureIso(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t > Date.now();
}

function isPastOrNowIso(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t <= Date.now();
}

export type TenderDetailAwardBannerState =
  | { kind: "summary"; row: TenderAwardSummaryForDetail }
  | { kind: "before_close"; message: string }
  | { kind: "before_openg"; message: string }
  | { kind: "outcome_hint"; outcome: "failed" | "cancelled" | "rebid"; detail: string | null; message: string }
  | { kind: "no_summary_closed"; message: string };

function detectOutcomeFromRaw(raw: unknown): {
  outcome: "failed" | "cancelled" | "rebid";
  detail: string | null;
} | null {
  const blob = JSON.stringify(raw ?? "").toLowerCase();
  if (blob.includes("유찰")) {
    return { outcome: "failed", detail: pickRawText(raw, ["bidNtceStatNm", "bid_ntce_stat_nm", "ntceKindNm", "ntce_kind_nm"]) };
  }
  if (blob.includes("재입찰") || blob.includes("재공고")) {
    return { outcome: "rebid", detail: pickRawText(raw, ["ntceKindNm", "ntce_kind_nm"]) };
  }
  if (
    blob.includes("입찰취소") ||
    blob.includes("공고취소") ||
    blob.includes("입찰 취소") ||
    blob.includes("공고 취소")
  ) {
    return { outcome: "cancelled", detail: pickRawText(raw, ["ntceKindNm", "ntce_kind_nm"]) };
  }
  const joined = [
    pickRawText(raw, ["ntceKindNm", "ntce_kind_nm", "bidNtceStatNm", "bid_ntce_stat_nm", "progrsDivNm", "progrs_div_nm"]),
  ]
    .filter(Boolean)
    .join(" ");
  if (/유찰/.test(joined)) return { outcome: "failed", detail: joined || null };
  if (/재입찰|재공고/.test(joined)) return { outcome: "rebid", detail: joined || null };
  if (/입찰\s*취소|공고\s*취소|취소\s*공고/.test(joined)) return { outcome: "cancelled", detail: joined || null };
  return null;
}

/** 공고 상세 상단 배너용: 낙찰 요약 행이 있으면 표시, 없으면 진행·유찰 등 안내 */
export function resolveTenderDetailAwardBannerState(
  tender: TenderForAwardBanner,
  award: TenderAwardSummaryForDetail | null
): TenderDetailAwardBannerState {
  if (award) {
    return { kind: "summary", row: award };
  }

  if (isFutureIso(tender.bid_clse_dt)) {
    return {
      kind: "before_close",
      message: "입찰 마감 전입니다. 개찰·낙찰 요약은 마감 이후 수집되면 이곳에 표시됩니다.",
    };
  }

  if (isFutureIso(tender.openg_dt)) {
    return {
      kind: "before_openg",
      message: "마감되었으며 개찰 일정 전입니다. 개찰 후 낙찰 정보가 수집되면 표시됩니다.",
    };
  }

  const closedLike =
    isPastOrNowIso(tender.bid_clse_dt) || isPastOrNowIso(tender.openg_dt) || (!tender.bid_clse_dt && !tender.openg_dt);

  if (closedLike) {
    const hint = detectOutcomeFromRaw(tender.raw);
    if (hint) {
      const labels: Record<typeof hint.outcome, string> = {
        failed: "유찰 등 낙찰이 없는 결과로 보입니다.",
        cancelled: "취소·변경 등으로 낙찰 요약이 없을 수 있습니다.",
        rebid: "재공고·재입찰 등으로 이 차수와 다른 흐름일 수 있습니다.",
      };
      return {
        kind: "outcome_hint",
        outcome: hint.outcome,
        detail: hint.detail,
        message: labels[hint.outcome],
      };
    }
  }

  return {
    kind: "no_summary_closed",
    message:
      "이 공고에 연결된 낙찰·개찰 요약이 없습니다. 수집 구간에 없었거나, 유찰·취소이거나, 아직 매칭되지 않았을 수 있습니다.",
  };
}

/** tender_id 우선, 없으면 공고번호·차수 변형으로 요약 1건 조회 */
export async function fetchTenderAwardSummaryForDetail(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  tenderId: string,
  bidNtceNo: string,
  bidNtceOrd: string
): Promise<TenderAwardSummaryForDetail | null> {
  const columns =
    "id,openg_dt,sucsfbider_nm,sucsfbid_amt,presmpt_prce,bid_rate_pct,prtcpt_cnum,competition_summary,rate_band";

  const byTender = await supabase
    .from("tender_award_summaries")
    .select(columns)
    .eq("tender_id", tenderId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!byTender.error && byTender.data) {
    return byTender.data as TenderAwardSummaryForDetail;
  }

  if (!bidNtceNo) return null;
  const ords = expandBidNtceOrdKeys(bidNtceOrd);
  const byBid = await supabase
    .from("tender_award_summaries")
    .select(columns)
    .eq("bid_ntce_no", bidNtceNo)
    .in("bid_ntce_ord", ords)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!byBid.error && byBid.data) {
    return byBid.data as TenderAwardSummaryForDetail;
  }

  return null;
}
