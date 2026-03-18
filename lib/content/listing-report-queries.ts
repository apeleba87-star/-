/**
 * 현장거래 시장 인텔리전스: listings 기반 집계 (시장 가격 구조, 평당 단가, 매매 배수, 지역별 건수).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getKstMonthKey } from "./kst-utils";

export type ListingMarketRow = {
  id: string;
  region: string | null;
  monthly_amount: number | null;
  deal_amount: number | null;
  area_pyeong: number | null;
  sale_multiplier: number | null;
};

export type PriceStats = {
  avg: number;
  median: number;
  min: number;
  max: number;
  sample_count: number;
};

export type ListingMarketIntelPayload = {
  period_key: string;
  period_label: string;
  total_open_count: number;
  region_breakdown: { name: string; count: number }[];
  /** 월 수금: 정기 매매 진행 중 건 기준 */
  monthly: PriceStats | null;
  /** 매매가 */
  deal: PriceStats | null;
  /** 매매 배수 (deal/monthly) */
  multiplier: PriceStats | null;
  /** 평당 단가 (월수금/평수), area_pyeong 있는 건만 */
  per_pyeong: PriceStats | null;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function toPriceStats(values: number[]): PriceStats | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / values.length),
    median: Math.round(median(values)),
    min: Math.min(...values),
    max: Math.max(...values),
    sample_count: values.length,
  };
}

function formatMonthLabel(periodKey: string): string {
  const m = periodKey.match(/^(\d{4})-(\d{2})$/);
  if (!m) return periodKey;
  return `${m[1]}년 ${parseInt(m[2], 10)}월`;
}

/**
 * 진행 중인 정기 매매(sale_regular, status=open) listings를 조회해
 * 월수금·매매가·매매 배수·평당 단가·지역별 건수 집계.
 */
export async function aggregateListingMarketIntel(
  supabase: SupabaseClient,
  date?: Date
): Promise<ListingMarketIntelPayload> {
  const periodKey = getKstMonthKey(date);
  const periodLabel = formatMonthLabel(periodKey);

  const { data: rows, error } = await supabase
    .from("listings")
    .select("id, region, monthly_amount, deal_amount, area_pyeong, sale_multiplier")
    .eq("listing_type", "sale_regular")
    .eq("status", "open")
    .limit(3000);

  if (error) throw new Error(`listings 집계 실패: ${error.message}`);
  const list = (rows ?? []) as ListingMarketRow[];

  const withMonthly = list.filter((r) => r.monthly_amount != null && r.monthly_amount > 0);
  const monthlyValues = withMonthly.map((r) => r.monthly_amount!);
  const monthly = toPriceStats(monthlyValues);

  const withDeal = list.filter((r) => r.deal_amount != null && r.deal_amount > 0);
  const dealValues = withDeal.map((r) => r.deal_amount!);
  const deal = toPriceStats(dealValues);

  const multiplierValues: number[] = [];
  for (const r of withMonthly) {
    const mult =
      r.sale_multiplier != null && r.sale_multiplier > 0 && r.sale_multiplier <= 100
        ? r.sale_multiplier
        : r.deal_amount != null && r.deal_amount > 0 && r.monthly_amount
          ? r.deal_amount / r.monthly_amount
          : null;
    if (mult != null && mult > 0 && mult <= 100) multiplierValues.push(mult);
  }
  const multiplier = toPriceStats(multiplierValues);

  const withPyeong = list.filter(
    (r) =>
      r.monthly_amount != null &&
      r.monthly_amount > 0 &&
      r.area_pyeong != null &&
      r.area_pyeong > 0
  );
  const perPyeongValues = withPyeong.map((r) => r.monthly_amount! / r.area_pyeong!);
  const per_pyeong = toPriceStats(perPyeongValues);

  const regionMap = new Map<string, number>();
  for (const r of list) {
    const name = (r.region ?? "").trim() || "미지정";
    regionMap.set(name, (regionMap.get(name) ?? 0) + 1);
  }
  const region_breakdown = Array.from(regionMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    period_key: periodKey,
    period_label: periodLabel,
    total_open_count: list.length,
    region_breakdown,
    monthly,
    deal,
    multiplier,
    per_pyeong,
  };
}
