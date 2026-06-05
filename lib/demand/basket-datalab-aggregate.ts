/** DataLab 일별·월별 index_ratio — Basket phrase 동일 날짜 합산 */

export type DemandKeywordDailyRow = {
  periodDate: string;
  indexRatio: number;
};

export function sumDailyIndexRowsByDate(rows: DemandKeywordDailyRow[]): DemandKeywordDailyRow[] {
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const d = r.periodDate.slice(0, 10);
    if (d.length !== 10) continue;
    byDate.set(d, (byDate.get(d) ?? 0) + (Number.isFinite(r.indexRatio) ? r.indexRatio : 0));
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodDate, indexRatio]) => ({ periodDate, indexRatio }));
}
