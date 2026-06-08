import type { DemandScopeTableRow } from "@/lib/demand/scope-data";

export type RegionAdFitBand = "very_high" | "high" | "mid" | "low";

export type RegionAdFit = {
  band: RegionAdFitBand;
  label: string;
  reason: string;
};

const BAND_LABELS: Record<RegionAdFitBand, string> = {
  very_high: "매우 적합",
  high: "적합",
  mid: "보통",
  low: "낮음",
};

/** 입주청소·포장이사 광고 적합도 — 영업 참고용 (보장·매출 예측 아님) */
export function resolveRegionAdFit(row: DemandScopeTableRow): RegionAdFit {
  const score = row.demandScore.score;
  const moveInIdx = row.moveInClean.indexMomPercent ?? 0;
  const packingIdx = row.packing.indexMomPercent ?? 0;
  const tradeMom = Math.max(row.saleMom, row.jeonseMom);
  const heat = row.demandScore.heat?.percentile ?? null;

  let points = 0;
  if (score >= 130) points += 2;
  else if (score >= 110) points += 1;
  if (moveInIdx >= 5) points += 2;
  else if (moveInIdx >= 0) points += 1;
  if (packingIdx >= 3) points += 1;
  if (tradeMom >= 5) points += 1;
  if (heat != null && heat >= 75) points += 1;

  let band: RegionAdFitBand;
  if (points >= 6) band = "very_high";
  else if (points >= 4) band = "high";
  else if (points >= 2) band = "mid";
  else band = "low";

  const parts: string[] = [];
  if (tradeMom !== 0) parts.push(`거래 ${tradeMom > 0 ? "+" : ""}${tradeMom}%`);
  if (Math.abs(moveInIdx) >= 0.05) parts.push(`입주청소 검색 ${moveInIdx > 0 ? "+" : ""}${moveInIdx.toFixed(1)}%`);
  if (heat != null) parts.push(`지역 상대 ${Math.round(heat)}%`);

  return {
    band,
    label: BAND_LABELS[band],
    reason:
      parts.length > 0
        ? `${parts.join(" · ")} — 청소·이사 광고 노출 우선순위 참고`
        : "거래·검색 변화가 작은 달 — 보수적 예산 권장",
  };
}
