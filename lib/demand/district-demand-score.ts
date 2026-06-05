import { DEMAND_HEAT_BAND_LABELS, formatDemandYyyymmLabel } from "@/lib/demand/copy";
import { computeDistrictRtmsIndex } from "@/lib/demand/district-rtms-index";
import type { NationalMovingInterest } from "@/lib/demand/moving-interest";
import type {
  MoveInDemandScoreResult,
  NationalMoveInSignal,
  RegionalMoveInSignal,
} from "@/lib/demand/move-in-demand-score";
import { DEMAND_HEAT_BAND_THRESHOLDS } from "@/lib/demand/demand-score-weights";

export type DemandHeatBand = "very_hot" | "hot" | "rising" | "normal" | "weak";

export type DistrictDemandScoreBasis = {
  /** 입주·청소 수요 대상월 (KST 이번 달) */
  targetYyyymm: string | null;
  /** RTMS·전국 검색 신호월 (대상월 − 1) */
  signalYyyymm: string | null;
  /** @deprecated signalYyyymm */
  searchYyyymm: string | null;
  /** @deprecated signalYyyymm */
  rtmsYyyymm: string | null;
  mixedMonths: boolean;
};

export type DistrictDemandScore = {
  score: number;
  band: DemandHeatBand;
  /** @deprecated UI 호환 — national composite */
  national: NationalMovingInterest;
  /** @deprecated UI 호환 — regional MoM 지수 */
  rtms: ReturnType<typeof computeDistrictRtmsIndex>;
  basis: DistrictDemandScoreBasis;
  /** V2 산출 내역 */
  v2?: MoveInDemandScoreResult;
};

export function demandHeatBand(score: number): DemandHeatBand {
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.veryHot) return "very_hot";
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.hot) return "hot";
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.rising) return "rising";
  if (score >= DEMAND_HEAT_BAND_THRESHOLDS.normal) return "normal";
  return "weak";
}

function legacyNationalFromSignal(signal: NationalMoveInSignal): NationalMovingInterest {
  const changePct = Math.round((signal.compositeIndex - 100) * 10) / 10;
  return {
    index: signal.compositeIndex,
    changePct,
    moms: { packingMom: null, moveInMom: null, handFreeMom: null },
    searchYyyymm: signal.signalYyyymm,
    handFreeForwardLabel: null,
    handFreeMissing: true,
  };
}

function legacyRtmsFromRegional(regional: RegionalMoveInSignal) {
  return computeDistrictRtmsIndex({
    saleMom: regional.saleMom,
    jeonseMom: regional.jeonseMom,
  });
}

function basisFromV2(result: MoveInDemandScoreResult): DistrictDemandScoreBasis {
  return {
    targetYyyymm: result.targetYyyymm,
    signalYyyymm: result.signalYyyymm,
    searchYyyymm: result.signalYyyymm,
    rtmsYyyymm: result.signalYyyymm,
    mixedMonths: false,
  };
}

export function districtDemandScoreFromMoveInResult(
  result: MoveInDemandScoreResult
): DistrictDemandScore {
  return {
    score: result.score,
    band: demandHeatBand(result.score),
    national: legacyNationalFromSignal(result.national),
    rtms: legacyRtmsFromRegional(result.regional),
    basis: basisFromV2(result),
    v2: result,
  };
}

/** 전국 행 — 구 RTMS 없이 전국 신호만 */
export function nationalOnlyDemandScore(
  national: NationalMovingInterest,
  targetYyyymm: string | null = null
): DistrictDemandScore {
  const signalYm = national.searchYyyymm;
  return {
    score: national.index,
    band: demandHeatBand(national.index),
    national,
    rtms: computeDistrictRtmsIndex({ saleMom: 0, jeonseMom: 0 }),
    basis: {
      targetYyyymm,
      signalYyyymm: signalYm,
      searchYyyymm: signalYm,
      rtmsYyyymm: null,
      mixedMonths: false,
    },
  };
}

export function formatDemandScoreSimpleSummary(score: DistrictDemandScore): string {
  const band = DEMAND_HEAT_BAND_LABELS[score.band].label;
  const target = score.basis.targetYyyymm;
  if (target) {
    return `${formatDemandYyyymmLabel(target)} 입주 참고 · ${band}`;
  }
  return `입주·청소 수요 참고 · ${band}`;
}

export function formatDemandScoreBasis(basis: DistrictDemandScoreBasis): string {
  const target = basis.targetYyyymm ? formatDemandYyyymmLabel(basis.targetYyyymm) : "—";
  const signal = basis.signalYyyymm ? formatDemandYyyymmLabel(basis.signalYyyymm) : "—";
  if (basis.targetYyyymm && basis.signalYyyymm) {
    return `${target} 입주 · ${signal} RTMS·검색`;
  }
  if (basis.targetYyyymm) {
    return `${target} 입주 참고`;
  }
  return "기준월 확인 중";
}

export function formatDemandScoreBreakdown(score: DistrictDemandScore): string {
  const v2 = score.v2;
  if (v2) {
    const n = v2.national;
    const r = v2.regional;
    return [
      `전국 ${n.compositeIndex}`,
      `(검색량 ${n.packingVolumeIndex}/${n.moveInVolumeIndex}`,
      `지수 ${n.packingSearchIndex}/${n.moveInSearchIndex})`,
      `× 구 ${r.compositeIndex}`,
      `(RTMS규모 ${r.rtmsLevelIndex}`,
      `MoM ${r.rtmsMomentumIndex})`,
      `÷ 100 = ${score.score}`,
    ].join(" ");
  }
  const n = score.national;
  const r = score.rtms;
  return `전국 ${n.index} × RTMS ${r.index} ÷ 100 = ${score.score}`;
}
