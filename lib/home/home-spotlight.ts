import type { SupabaseClient } from "@supabase/supabase-js";
import { getHomeSpotlightTenderRowFromActiveIndustries } from "@/lib/content/home-tender-stats";
import { getBaseAmtFromRaw, dday, parseRegionSido, shortRegion } from "@/lib/tender-utils";

export type HomeSpotlightTender = {
  id: string;
  title: string;
  regionLabel: string;
  ddayLabel: string;
  amountWon: number | null;
};

export type HomeSpotlightJob = {
  id: string;
  title: string;
  regionLabel: string;
  /** 세전 연환산 (일당×220일) */
  annualWon: number;
  dailyWon: number;
  workFormLabel: string;
};

function resolveTenderAmount(row: {
  base_amt: number | string | null;
  raw?: unknown;
}): number | null {
  if (row.base_amt != null) {
    const n = Number(row.base_amt);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return getBaseAmtFromRaw(row.raw) ?? null;
}

function pickRawString(raw: unknown, keys: string[]): string | null {
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

/** G2B raw에서 사업·참가 지역 문자열 추출 (컬럼이 비었을 때) */
function pickRegionTextFromRaw(raw: unknown): string | null {
  return pickRawString(raw, [
    "bsnsDstrNm",
    "bsns_dstr_nm",
    "사업지역",
    "참가가능지역",
    "지역",
    "rgnNm",
    "rgn_nm",
    "prtcptPsblRgnNm",
    "prtcpt_psbl_rgn_nm",
  ]);
}

/**
 * 목록 카드(TenderBidCard)와 유사한 우선순위: 사업지역 → raw → 시도 배열 → 공고기관명 → 제목·통합본에서 시도 파싱
 */
function tenderRegionLabel(row: {
  bsns_dstr_nm: string | null;
  ntce_instt_nm?: string | null;
  dmand_instt_nm?: string | null;
  bid_ntce_nm?: string | null;
  region_sido_list?: unknown;
  raw?: unknown;
}): string {
  const bsns = (row.bsns_dstr_nm ?? "").trim();
  if (bsns) return shortRegion(bsns);

  const fromRaw = pickRegionTextFromRaw(row.raw);
  if (fromRaw) return shortRegion(fromRaw);

  const list = row.region_sido_list;
  if (Array.isArray(list) && list.length > 0 && typeof list[0] === "string") {
    const first = list[0].trim();
    if (first) return shortRegion(first);
  }

  let instt = (row.ntce_instt_nm ?? "").trim();
  if (!instt) instt = pickRawString(row.raw, ["ntceInsttNm", "ntce_instt_nm", "공고기관명", "계약기관명"]) ?? "";
  if (instt) return shortRegion(instt);

  const dmandRaw = pickRawString(row.raw, ["dmandInsttNm", "dmand_instt_nm", "수요기관명"]);
  const dmandCol = (row.dmand_instt_nm ?? "").trim();
  const dmand = (dmandRaw ?? "").trim() || dmandCol;
  if (dmand) return shortRegion(dmand);

  const title =
    (row.bid_ntce_nm ?? "").trim() ||
    pickRawString(row.raw, ["bidNtceNm", "bid_ntce_nm", "공고명"]) ||
    "";
  const blob = [bsns, fromRaw, instt, dmand ?? "", title].filter(Boolean).join(" ");
  const sido = parseRegionSido(blob);
  if (sido) return sido;

  return "—";
}

/**
 * 등록 업종(is_active + tender_industries / primary)에 매칭된 진행 중 공고만 대상으로,
 * 기초금액(또는 raw 추출)이 가장 큰 1건.
 */
export async function fetchHomeSpotlightTender(
  supabase: SupabaseClient
): Promise<HomeSpotlightTender | null> {
  const row = await getHomeSpotlightTenderRowFromActiveIndustries(supabase);
  if (!row) return null;

  const amountWon = resolveTenderAmount(row);
  return {
    id: row.id,
    title: (row.bid_ntce_nm ?? "입찰 공고").trim() || "입찰 공고",
    regionLabel: tenderRegionLabel(row),
    ddayLabel: dday(row.bid_clse_dt),
    amountWon,
  };
}

/** 일당 × 220(연 근무일 가정) → 연 환산 세전 */
export function annualWonFromDailyWage(daily: number): number {
  if (!Number.isFinite(daily) || daily <= 0) return 0;
  return Math.round(daily * 220);
}

/**
 * 공개 구인 중 normalized_daily_wage 합산 상한이 가장 큰 현장 1건.
 */
export async function fetchHomeSpotlightJob(
  supabase: SupabaseClient,
  openVisibleOrFilter: string
): Promise<HomeSpotlightJob | null> {
  const { data, error } = await supabase
    .from("job_posts")
    .select(
      "id, title, region, district, status, job_post_positions ( normalized_daily_wage )"
    )
    .eq("status", "open")
    .or(openVisibleOrFilter)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error || !data?.length) return null;

  type Row = (typeof data)[0];
  let best: Row | null = null;
  let bestDaily = -1;

  for (const row of data) {
    const positions = row.job_post_positions;
    if (!Array.isArray(positions) || positions.length === 0) continue;
    let maxP = 0;
    for (const p of positions) {
      const w = p?.normalized_daily_wage != null ? Number(p.normalized_daily_wage) : 0;
      if (w > maxP) maxP = w;
    }
    if (maxP > bestDaily) {
      bestDaily = maxP;
      best = row;
    }
  }

  if (!best || bestDaily <= 0) return null;

  const district = (best.district ?? "").trim();
  const regionLabel = district ? `${best.region} ${district}` : best.region;
  const annual = annualWonFromDailyWage(bestDaily);

  return {
    id: best.id,
    title: (best.title ?? "구인").trim() || "구인",
    regionLabel,
    annualWon: annual,
    dailyWon: Math.round(bestDaily),
    workFormLabel: "현장 일당",
  };
}

/** 집계 시각 → 짧은 한국어 상대/절대 혼합 (SSR 고정) */
export function formatDataSyncedLabel(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "집계 시각 확인 중";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "집계 시각 확인 중";
  const diffMs = now.getTime() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "방금 전 반영";
  if (mins < 60) return `${mins}분 전 반영`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전 반영`;
  const d = new Date(iso);
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm} 기준`;
}
