import type { DemandChartPoint } from "@/lib/demand/scope-data";

/**
 * 입주 온도 — 다음 달 입주·청소 수요 신호 추정 (참고용).
 *
 * 가설: 포장이사 검색량(선행)이 먼저 오르고 → 다음 달 입주청소 검색량이 따라온다.
 * 현재(전월·최근) 데이터만 사용하며, 가중치는 포장이사 검색량 변화에 가장 크다.
 */
export const DEMAND_COMPOSITE_WEIGHTS = {
  /** 포장이사 검색량 전월 대비 — 선행 지표 (최우선) */
  packingVolumeMom: 0.55,
  /** 전월세 거래량 전월 대비 */
  jeonseMom: 0.2,
  /** 주택매매 거래량 전월 대비 */
  saleMom: 0.15,
  /** 입주청소 검색(확인·후행) — 낮은 비중 */
  moveInConfirmMom: 0.1,
} as const;

export type DemandCompositeInputs = {
  packingVolumeMom: number;
  jeonseMom: number;
  saleMom: number;
  moveInConfirmMom: number;
};

const MOM_CLAMP = 35;
const SCORE_MIN = 50;
const SCORE_MAX = 160;

function clampMom(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-MOM_CLAMP, Math.min(MOM_CLAMP, v));
}

/** 전월 대비 % (직전·이전 구간) */
export function momPercentFromChartPoints(points: DemandChartPoint[]): number | null {
  if (points.length < 2) return null;
  const prev = points[points.length - 2].value;
  const curr = points[points.length - 1].value;
  if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev <= 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export function computeDemandCompositeIndex(inputs: DemandCompositeInputs): number {
  const w = DEMAND_COMPOSITE_WEIGHTS;
  const raw =
    100 +
    clampMom(inputs.packingVolumeMom) * w.packingVolumeMom +
    clampMom(inputs.jeonseMom) * w.jeonseMom +
    clampMom(inputs.saleMom) * w.saleMom +
    clampMom(inputs.moveInConfirmMom) * w.moveInConfirmMom;
  return Math.round(Math.max(SCORE_MIN, Math.min(SCORE_MAX, raw)));
}

export type DemandCompositeScopeSignals = {
  packing: { indexMomPercent: number };
  moveInClean: { indexMomPercent: number };
  packingVolumeMonthly?: DemandChartPoint[];
  moveInVolumeMonthly?: DemandChartPoint[];
  saleMom: number;
  jeonseMom: number;
};

/** 허브·비교 행 — 키워드·RTMS가 반영된 뒤 신호 */
export function compositeInputsFromScopeSignals(
  signals: DemandCompositeScopeSignals
): DemandCompositeInputs {
  const packingVolMom =
    momPercentFromChartPoints(signals.packingVolumeMonthly ?? []) ??
    signals.packing.indexMomPercent;

  const moveInVolMom =
    momPercentFromChartPoints(signals.moveInVolumeMonthly ?? []) ??
    signals.moveInClean.indexMomPercent;

  return {
    packingVolumeMom: packingVolMom,
    jeonseMom: signals.jeonseMom,
    saleMom: signals.saleMom,
    moveInConfirmMom: moveInVolMom,
  };
}

/** 25구 표 등 — 검색량 월별 없을 때 포장·입주 지수 MoM을 검색량 proxy로 사용 */
export function compositeInputsFromTableMoms(moms: {
  packingMom: number;
  moveInCleanMom: number;
  jeonseMom: number;
  saleMom: number;
}): DemandCompositeInputs {
  return {
    packingVolumeMom: moms.packingMom,
    jeonseMom: moms.jeonseMom,
    saleMom: moms.saleMom,
    moveInConfirmMom: moms.moveInCleanMom,
  };
}

export function compositeScoreFromScopeSignals(signals: DemandCompositeScopeSignals): number {
  return computeDemandCompositeIndex(compositeInputsFromScopeSignals(signals));
}

/** UI 비노출 — 내부 가중치 문서용 */
export const DEMAND_COMPOSITE_FORMULA_HINT =
  "포장이사 검색량(전월) 55% · 전월세 20% · 매매 15% · 입주청소(확인) 10%";
