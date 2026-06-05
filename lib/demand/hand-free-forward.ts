import { demandIsIncompleteSearchVolumeMonth } from "@/lib/demand/searchad-month-report";
import type { DemandChartPoint } from "@/lib/demand/scope-data";

export type HandFreeVolumeMonthRow = {
  yyyymm: string;
  volume: number | null;
  belowTen: boolean;
};

/** 검색 데이터 yyyymm의 달(1–12) → 그 달에 합산할 「앞 2달」 손없는날 phrase */
export function handFreeForwardPhrasesForCalendarMonth(month1to12: number): [string, string] {
  const m = ((month1to12 - 1) % 12) + 1;
  const next1 = (m % 12) + 1;
  const next2 = ((m + 1) % 12) + 1;
  return [`${next1}월손없는날`, `${next2}월손없는날`];
}

/** 영업 참고월(검색 확정월 다음 달) → UI용 「7·8월」 */
export function handFreeForwardDisplayForBusinessMonth(month1to12: number): string {
  const [a, b] = handFreeForwardPhrasesForCalendarMonth(month1to12);
  const monthNum = (phrase: string) => phrase.replace(/월손없는날$/, "");
  return `${monthNum(a)}·${monthNum(b)}월`;
}

export function businessMonthAfterSearchYyyymm(searchYyyymm: string): number {
  const m = Number.parseInt(searchYyyymm.split("-")[1] ?? "1", 10);
  return m >= 12 ? 1 : m + 1;
}

function yyyymmToChartPeriod(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  return `${y.slice(2)}.${Number(m)}`;
}

function volumeAtPhraseMonth(
  byPhrase: Record<string, HandFreeVolumeMonthRow[]>,
  phrase: string,
  yyyymm: string
): number {
  const row = byPhrase[phrase]?.find((r) => r.yyyymm === yyyymm);
  if (!row || row.belowTen || row.volume == null || !Number.isFinite(row.volume)) return 0;
  return row.volume;
}

/**
 * phrase별 월별 검색량 → 「그 달에 앞 2달 손없는날만」 합산 시계열.
 * 예: 2026-05 행 = 5월에 검색된 6월손없는날 + 7월손없는날.
 */
export function buildHandFreeForwardVolumeSeries(
  byPhrase: Record<string, HandFreeVolumeMonthRow[]>
): DemandChartPoint[] {
  const yyyymms = new Set<string>();
  for (const rows of Object.values(byPhrase)) {
    for (const r of rows) {
      if (!demandIsIncompleteSearchVolumeMonth(r.yyyymm)) {
        yyyymms.add(r.yyyymm);
      }
    }
  }

  return [...yyyymms]
    .sort()
    .map((yyyymm) => {
      const calMonth = Number.parseInt(yyyymm.split("-")[1] ?? "1", 10);
      const [p1, p2] = handFreeForwardPhrasesForCalendarMonth(calMonth);
      const value = volumeAtPhraseMonth(byPhrase, p1, yyyymm) + volumeAtPhraseMonth(byPhrase, p2, yyyymm);
      return { period: yyyymmToChartPeriod(yyyymm), value };
    });
}

/** 최소 1개 phrase에 2개월+ 또는 forward 시계열 2점+ */
export function handFreeForwardDataReady(byPhrase: Record<string, HandFreeVolumeMonthRow[]>): boolean {
  const forwardSeries = buildHandFreeForwardVolumeSeries(byPhrase);
  if (forwardSeries.length >= 2) return true;
  return Object.values(byPhrase).some((rows) => rows.filter((r) => r.volume != null && r.volume > 0).length >= 2);
}

export function handFreeForwardLabelAfterSearch(searchYyyymm: string | null): string | null {
  if (!searchYyyymm) return null;
  return handFreeForwardDisplayForBusinessMonth(businessMonthAfterSearchYyyymm(searchYyyymm));
}

export function handFreeForwardPhrasesAfterSearch(
  searchYyyymm: string | null
): [string, string] | null {
  if (!searchYyyymm) return null;
  return handFreeForwardPhrasesForCalendarMonth(businessMonthAfterSearchYyyymm(searchYyyymm));
}
