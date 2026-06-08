import type { DemandHeatBandMeta } from "@/lib/demand/demand-heat-band";

/** 그래프 백분위 — 한국어 상·하위 표현 */
export function formatDemandHeatPercentileLabel(heat: DemandHeatBandMeta): string | null {
  if (!heat.relative || heat.percentile == null) return null;
  const n = heat.historyMonths;
  const p = heat.percentile;
  if (p >= 50) {
    return `최근 ${n}개월 상위 ${Math.max(1, Math.round(100 - p))}%`;
  }
  return `최근 ${n}개월 하위 ${Math.max(1, Math.round(p))}%`;
}

export function formatDemandHeatPercentileSentence(heat: DemandHeatBandMeta): string | null {
  const label = formatDemandHeatPercentileLabel(heat);
  return label ? `${label}.` : null;
}
