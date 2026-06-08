import { DEMAND_HEAT_BAND_LABELS, formatDemandYyyymmLabel } from "@/lib/demand/copy";
import { computeDistrictRtmsIndex } from "@/lib/demand/district-rtms-index";
import type { DemandHeatBandMeta } from "@/lib/demand/demand-heat-band";
import { resolveDemandHeatBand } from "@/lib/demand/demand-heat-band";
import { formatDemandHeatPercentileLabel, formatDemandHeatPercentileSentence } from "@/lib/demand/demand-heat-copy";
import type { NationalMovingInterest } from "@/lib/demand/moving-interest";
import type {
  MoveInDemandScoreResult,
  NationalMoveInSignal,
  RegionalMoveInSignal,
} from "@/lib/demand/move-in-demand-score";
import { DEMAND_HEAT_BAND_THRESHOLDS, REGIONAL_HEAT_BAND_MIN_HISTORY } from "@/lib/demand/demand-score-weights";

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
  /** 지역 그래프 상대 밴드 메타 (카드·배지 보조) */
  heat?: DemandHeatBandMeta;
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
  result: MoveInDemandScoreResult,
  benchmarkScores: number[] = []
): DistrictDemandScore {
  const { band, meta } = resolveDemandHeatBand(result.score, benchmarkScores);
  return {
    score: result.score,
    band,
    heat: meta,
    national: legacyNationalFromSignal(result.national),
    rtms: legacyRtmsFromRegional(result.regional),
    basis: basisFromV2(result),
    v2: result,
  };
}

/** 전국 행 — 구 RTMS 없이 전국 신호만 */
export function nationalOnlyDemandScore(
  national: NationalMovingInterest,
  targetYyyymm: string | null = null,
  benchmarkScores: number[] = []
): DistrictDemandScore {
  const signalYm = national.searchYyyymm;
  const { band, meta } = resolveDemandHeatBand(national.index, benchmarkScores);
  return {
    score: national.index,
    band,
    heat: meta,
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
  const relativeNote =
    score.heat?.relative && score.heat.percentile != null
      ? ` · ${formatDemandHeatPercentileLabel(score.heat) ?? ""}`
      : "";
  if (target) {
    return `${formatDemandYyyymmLabel(target)} 입주 참고 · ${band}${relativeNote}`;
  }
  return `입주·청소 수요 참고 · ${band}${relativeNote}`;
}

/** 카드·표 보조 — 대상월만 (RTMS·검색 월은 차트 부제 등에 사용) */
export function formatDemandScoreBasis(basis: DistrictDemandScoreBasis): string {
  if (basis.targetYyyymm) {
    return `${formatDemandYyyymmLabel(basis.targetYyyymm)} 기준`;
  }
  return "";
}

export function formatDemandScoreBreakdown(score: DistrictDemandScore): string {
  return formatDemandScoreBasis(score.basis);
}

/** 배지 title — 지역 그래프 상대 백분위 보조 */
export function formatDemandHeatTooltip(score: DistrictDemandScore): string {
  const base = DEMAND_HEAT_BAND_LABELS[score.band].description;
  const heat = score.heat;
  if (heat?.relative && heat.percentile != null) {
    const sentence = formatDemandHeatPercentileSentence(heat);
    return sentence ? `${base} ${sentence}` : base;
  }
  if (heat && !heat.relative && heat.historyMonths < REGIONAL_HEAT_BAND_MIN_HISTORY) {
    return `${base} (과거 ${heat.historyMonths}개월 — 절대 기준 폴백)`;
  }
  return base;
}
