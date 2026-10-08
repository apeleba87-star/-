export type StatProject = {
  id: string;
  service_type: string;
  region_sigungu: string | null;
  region_dong: string | null;
  property_type: string | null;
  area_pyeong: number | null;
  worker_count: number | null;
  work_minutes: number | null;
  price: number | null;
  work_date: string | null;
  created_at: string;
};

export type ServiceShare = { service: string; revenue: number; count: number };

export type MonthSummary = {
  count: number;
  revenue: number;
  pricedCount: number;
  avgPrice: number | null;
  manHours: number;
  perManHour: number | null;
  perPyeong: number | null;
  missing: number;
  byService: ServiceShare[];
  best: StatProject[];
  worst: StatProject[];
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstToday(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isMonthKey(v: string | undefined): v is string {
  return Boolean(v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v));
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monthRangeIso(month: string): { start: string; end: string } {
  return { start: `${month}-01T00:00:00+09:00`, end: `${shiftMonth(month, 1)}-01T00:00:00+09:00` };
}

export function workDay(p: Pick<StatProject, "work_date" | "created_at">): string {
  if (p.work_date) return p.work_date.slice(0, 10);
  return new Date(new Date(p.created_at).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function manHoursOf(p: StatProject): number | null {
  return p.worker_count && p.work_minutes ? (p.worker_count * p.work_minutes) / 60 : null;
}

export function perManHourOf(p: StatProject): number | null {
  const h = manHoursOf(p);
  return h && p.price ? p.price / h : null;
}

export function summarize(rows: StatProject[]): MonthSummary {
  let revenue = 0;
  let pricedCount = 0;
  let effRevenue = 0;
  let effHours = 0;
  let manHours = 0;
  let areaRevenue = 0;
  let area = 0;
  let missing = 0;
  const services = new Map<string, ServiceShare>();

  for (const r of rows) {
    const h = manHoursOf(r);
    if (!r.price || !h) missing += 1;
    if (h) manHours += h;
    if (!r.price) continue;
    revenue += r.price;
    pricedCount += 1;
    if (h) {
      effRevenue += r.price;
      effHours += h;
    }
    if (r.area_pyeong) {
      areaRevenue += r.price;
      area += r.area_pyeong;
    }
    const s = services.get(r.service_type) ?? { service: r.service_type, revenue: 0, count: 0 };
    s.revenue += r.price;
    s.count += 1;
    services.set(r.service_type, s);
  }

  const ranked = rows
    .filter((r) => perManHourOf(r) != null)
    .sort((a, b) => (perManHourOf(b) ?? 0) - (perManHourOf(a) ?? 0));
  const best = ranked.slice(0, 3);
  const worst = ranked.length > 3 ? ranked.slice(Math.max(3, ranked.length - 3)).reverse() : [];

  return {
    count: rows.length,
    revenue,
    pricedCount,
    avgPrice: pricedCount ? revenue / pricedCount : null,
    manHours,
    perManHour: effHours ? effRevenue / effHours : null,
    perPyeong: area ? areaRevenue / area : null,
    missing,
    byService: [...services.values()].sort((a, b) => b.revenue - a.revenue),
    best,
    worst,
  };
}

export function won(v: number): string {
  return `${Math.round(v).toLocaleString("ko-KR")}원`;
}

export function manwon(v: number): string {
  if (Math.abs(v) < 10000) return won(v);
  const m = Math.round(v / 1000) / 10;
  return `${m.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}만원`;
}
