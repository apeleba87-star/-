import type { JobWageProvinceRow } from "@/lib/jobs/job-wage-daily-report";

/** 공고 수 가중 시·도 평균 일당의 전국 대표값(원, 반올림) */
export function weightedMeanDailyWage(provinces: JobWageProvinceRow[]): number | null {
  let sumW = 0;
  let sumC = 0;
  for (const p of provinces) {
    if (p.jobPostCount <= 0) continue;
    sumW += p.avgDailyWage * p.jobPostCount;
    sumC += p.jobPostCount;
  }
  if (sumC === 0) return null;
  return Math.round(sumW / sumC);
}

const BIN_LABELS = ["12만원 미만", "12~14만원", "14~16만원", "16~18만원", "18~20만원", "20만원 이상"] as const;

function binIndex(avgDailyWage: number): number {
  if (avgDailyWage < 120_000) return 0;
  if (avgDailyWage < 140_000) return 1;
  if (avgDailyWage < 160_000) return 2;
  if (avgDailyWage < 180_000) return 3;
  if (avgDailyWage < 200_000) return 4;
  return 5;
}

/** 시·도별 평균을 만원대 구간으로 묶어 공고 수 합산(분포 감각용) */
export function provinceWeightedWageBins(provinces: JobWageProvinceRow[]): { label: string; jobPostCount: number }[] {
  const counts = [0, 0, 0, 0, 0, 0];
  for (const p of provinces) {
    if (p.jobPostCount <= 0) continue;
    counts[binIndex(p.avgDailyWage)] += p.jobPostCount;
  }
  return BIN_LABELS.map((label, i) => ({ label, jobPostCount: counts[i]! }));
}

export type NationalCompare = {
  currAvg: number | null;
  prevAvg: number | null;
  delta: number | null;
  deltaPct: number | null;
};

export function compareWeightedNationalAvg(
  currProvinces: JobWageProvinceRow[],
  prevProvinces: JobWageProvinceRow[]
): NationalCompare {
  const currAvg = weightedMeanDailyWage(currProvinces);
  const prevAvg = weightedMeanDailyWage(prevProvinces);
  if (currAvg == null || prevAvg == null) {
    return { currAvg, prevAvg, delta: null, deltaPct: null };
  }
  const delta = currAvg - prevAvg;
  const deltaPct = prevAvg !== 0 ? Number(((delta / prevAvg) * 100).toFixed(1)) : null;
  return { currAvg, prevAvg, delta, deltaPct };
}
