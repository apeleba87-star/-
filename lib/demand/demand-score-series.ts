import { computeDistrictRtmsIndex } from "@/lib/demand/district-rtms-index";
import { computeNationalMovingInterest } from "@/lib/demand/moving-interest";
import type { DemandRtmsMonthlyPoint } from "@/lib/demand/rtms-types";

type DemandScoreChartPoint = { period: string; value: number };

export function chartPeriodToYyyymm(period: string): string | null {
  const kr = period.match(/^(\d{4})년\s*(\d{1,2})월$/);
  if (kr) {
    return `${kr[1]}-${String(Number(kr[2])).padStart(2, "0")}`;
  }
  const legacy = period.match(/^(\d{2})\.(\d{1,2})$/);
  if (legacy) {
    return `20${legacy[1]}-${String(Number(legacy[2])).padStart(2, "0")}`;
  }
  return null;
}

export function yyyymmToDemandChartPeriod(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  if (!y || !m) return yyyymm;
  return `${y.slice(2)}.${Number(m)}`;
}

function momPercent(curr: number, prev: number): number {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function volumeByYyyymm(series: DemandScoreChartPoint[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of series) {
    const ym = chartPeriodToYyyymm(p.period);
    if (!ym || !Number.isFinite(p.value) || p.value <= 0) continue;
    out.set(ym, p.value);
  }
  return out;
}

/** 전국 이사 관심 지수 — 검색량 월별 스냅샷 MoM */
export function buildNationalInterestMonthlyByYyyymm(
  packingSeries: DemandScoreChartPoint[],
  moveInSeries: DemandScoreChartPoint[]
): Map<string, number> {
  const packing = volumeByYyyymm(packingSeries);
  const moveIn = volumeByYyyymm(moveInSeries);
  const months = [...new Set([...packing.keys(), ...moveIn.keys()])].sort();
  const out = new Map<string, number>();

  for (let i = 0; i < months.length; i += 1) {
    const ym = months[i];
    const prevYm = i > 0 ? months[i - 1] : null;
    const packingMom =
      prevYm && packing.has(prevYm) && packing.has(ym)
        ? momPercent(packing.get(ym)!, packing.get(prevYm)!)
        : 0;
    const moveInMom =
      prevYm && moveIn.has(prevYm) && moveIn.has(ym)
        ? momPercent(moveIn.get(ym)!, moveIn.get(prevYm)!)
        : 0;

    const interest = computeNationalMovingInterest(
      { packingMom, moveInMom, handFreeMom: null },
      ym,
      true,
      null
    );
    out.set(ym, interest.index);
  }
  return out;
}

/** 구 RTMS 지수 — 월별 거래 MoM */
export function buildDistrictRtmsIndexMonthlyByYyyymm(
  rtms: DemandRtmsMonthlyPoint[]
): Map<string, number> {
  const sorted = [...rtms].sort((a, b) => a.yyyymm.localeCompare(b.yyyymm));
  const out = new Map<string, number>();

  for (let i = 0; i < sorted.length; i += 1) {
    const cur = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const saleMom = prev ? momPercent(cur.saleCount, prev.saleCount) : 0;
    const jeonseMom = prev ? momPercent(cur.jeonseCount, prev.jeonseCount) : 0;
    out.set(cur.yyyymm, computeDistrictRtmsIndex({ saleMom, jeonseMom }).index);
  }
  return out;
}

export function mergeDistrictDemandScoreMonthlyPoints(
  nationalByYm: Map<string, number>,
  rtmsByYm: Map<string, number>
): DemandScoreChartPoint[] {
  const months = [...nationalByYm.keys()].filter((ym) => rtmsByYm.has(ym)).sort();
  return months.map((ym) => ({
    period: yyyymmToDemandChartPeriod(ym),
    value: Math.round(((nationalByYm.get(ym)! * rtmsByYm.get(ym)!) / 100) * 10) / 10,
  }));
}

export function nationalInterestMonthlyPoints(
  packingSeries: DemandScoreChartPoint[],
  moveInSeries: DemandScoreChartPoint[]
): DemandScoreChartPoint[] {
  const byYm = buildNationalInterestMonthlyByYyyymm(packingSeries, moveInSeries);
  return [...byYm.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, index]) => ({
      period: yyyymmToDemandChartPeriod(ym),
      value: index,
    }));
}
