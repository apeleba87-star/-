import { DEMAND_HEAT_BAND_LABELS, formatDemandYyyymmLabel } from "@/lib/demand/copy";
import { computeDistrictRtmsIndex, type DistrictRtmsIndex } from "@/lib/demand/district-rtms-index";
import type { NationalMovingInterest } from "@/lib/demand/moving-interest";
import { DEMAND_HEAT_BAND_THRESHOLDS } from "@/lib/demand/demand-score-weights";

export type DemandHeatBand = "very_hot" | "hot" | "rising" | "normal" | "weak";

export type DistrictDemandScoreBasis = {
  searchYyyymm: string | null;
  rtmsYyyymm: string | null;
  /** 검색월 ≠ RTMS월 */
  mixedMonths: boolean;
};

export type DistrictDemandScore = {
  score: number;
  band: DemandHeatBand;
  national: NationalMovingInterest;
  rtms: DistrictRtmsIndex;
  basis: DistrictDemandScoreBasis;
};

export function demandHeatBand(score: number): DemandHeatBand {
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.veryHot) return "very_hot";
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.hot) return "hot";
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.rising) return "rising";
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.normal) return "normal";
  return "weak";
}

export function computeDistrictDemandScore(
  national: NationalMovingInterest,
  rtmsInput: { saleMom: number; jeonseMom: number },
  basis: DistrictDemandScoreBasis
): DistrictDemandScore {
  const rtms = computeDistrictRtmsIndex(rtmsInput);
  const raw = (national.index * rtms.index) / 100;
  const score = Math.round(raw * 10) / 10;
  return {
    score,
    band: demandHeatBand(score),
    national,
    rtms,
    basis,
  };
}

/** 전국 행 — RTMS 없이 시장 관심도만 */
export function nationalOnlyDemandScore(national: NationalMovingInterest): DistrictDemandScore {
  return {
    score: national.index,
    band: demandHeatBand(national.index),
    national,
    rtms: computeDistrictRtmsIndex({ saleMom: 0, jeonseMom: 0 }),
    basis: {
      searchYyyymm: national.searchYyyymm,
      rtmsYyyymm: null,
      mixedMonths: false,
    },
  };
}

export function formatDemandScoreSimpleSummary(score: DistrictDemandScore): string {
  const band = DEMAND_HEAT_BAND_LABELS[score.band].label;
  const month = score.basis.rtmsYyyymm ?? score.basis.searchYyyymm;
  if (month) {
    return `${formatDemandYyyymmLabel(month)} 기준 · 이 구 거래와 전국 검색을 함께 본 참고 점수 · ${band}`;
  }
  return `이 구 거래와 전국 검색을 함께 본 참고 점수 · ${band}`;
}

export function formatDemandScoreBasis(basis: DistrictDemandScoreBasis): string {
  const search = basis.searchYyyymm ? formatYyyymmLabel(basis.searchYyyymm) : "—";
  const rtms = basis.rtmsYyyymm ? formatYyyymmLabel(basis.rtmsYyyymm) : "—";
  if (basis.mixedMonths && basis.searchYyyymm && basis.rtmsYyyymm) {
    return `전국 검색 ${search} · RTMS ${rtms}`;
  }
  if (basis.searchYyyymm && basis.rtmsYyyymm) {
    return `기준 ${search} (검색·RTMS)`;
  }
  if (basis.searchYyyymm) {
    return `전국 검색 ${search}`;
  }
  if (basis.rtmsYyyymm) {
    return `RTMS ${rtms}`;
  }
  return "기준월 확인 중";
}

function formatYyyymmLabel(yyyymm: string): string {
  return formatDemandYyyymmLabel(yyyymm);
}

export function formatDemandScoreBreakdown(score: DistrictDemandScore): string {
  const n = score.national;
  const r = score.rtms;
  const parts = [
    `전국 ${n.index} (100${n.changePct >= 0 ? "+" : ""}${n.changePct})`,
    score.basis.rtmsYyyymm
      ? `RTMS ${r.index} (100${r.changePct >= 0 ? "+" : ""}${r.changePct})`
      : null,
  ].filter(Boolean);
  return parts.join(" × ") + ` ÷ 100 = ${score.score}`;
}
