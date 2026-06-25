import type { SupabaseClient } from "@supabase/supabase-js";

import {
  REPORT_TYPE_DEMAND_SALES_REGION,
  type DemandSalesRegionReportContent,
  type DemandSalesRegionReportItem,
} from "@/lib/content/report-snapshot-types";
import {
  formatDemandRegionLabel,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { listAllDistrictKeywordTargets } from "@/lib/demand/region-search-keywords";

type ScopeOption = { kind: "national" } | { kind: "city"; cityId: string };

type KeywordMonthlyRow = {
  region_key: string;
  yyyymm: string;
  search_volume_month: number | null;
  search_volume_below_ten: boolean | null;
};

type RtmsMonthlyRow = {
  region_key: string;
  yyyymm: string;
  sale_count: number | null;
  jeonse_count: number | null;
};

export type DemandSalesRegionReportSnapshot = {
  report_type: typeof REPORT_TYPE_DEMAND_SALES_REGION;
  period_key: string;
  title: string;
  content_full: DemandSalesRegionReportContent;
  content_summary: DemandSalesRegionReportContent;
  content_social: string;
  sample_count: number;
};

const REPORT_REGION_LIMIT = 10;

function monthLabel(yyyymm: string | null): string {
  if (!yyyymm) return "최근 수집 기준";
  const [year, month] = yyyymm.split("-");
  return `${Number(year)}년 ${Number(month)}월`;
}

function normalizePercent(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || !Number.isFinite(curr) || !Number.isFinite(prev) || prev <= 0) {
    return null;
  }
  return Math.round(((curr - prev) / prev) * 1000 / 10);
}

function minMaxScore(value: number, min: number, max: number, weight: number): number {
  if (!Number.isFinite(value) || max <= min) return 0;
  const bounded = Math.max(min, Math.min(max, value));
  return Math.round(((bounded - min) / (max - min)) * weight);
}

function growthScore(value: number | null, weight: number): number {
  if (value == null || !Number.isFinite(value)) return 0;
  if (value <= -30) return 0;
  if (value >= 60) return weight;
  return Math.round(((value + 30) / 90) * weight);
}

function confidenceFor(item: {
  searchVolume: number | null;
  saleCount: number;
  jeonseCount: number;
  hasPreviousKeyword: boolean;
  hasCurrentRtms: boolean;
}): "high" | "medium" | "low" {
  const signals = [
    item.searchVolume != null && item.searchVolume > 0,
    item.hasPreviousKeyword,
    item.hasCurrentRtms,
    item.saleCount + item.jeonseCount > 0,
  ].filter(Boolean).length;
  if (signals >= 4) return "high";
  if (signals >= 2) return "medium";
  return "low";
}

function recommendationFor(item: {
  searchMomPercent: number | null;
  saleMomPercent: number | null;
  jeonseMomPercent: number | null;
  score: number;
}): string {
  if (item.score >= 75 && (item.searchMomPercent ?? 0) >= 0) {
    return "검색 수요와 거래 신호가 모두 좋아 우선 영업 후보입니다.";
  }
  if ((item.searchMomPercent ?? 0) >= 30) {
    return "검색 관심이 빠르게 올라 사전 홍보를 테스트하기 좋습니다.";
  }
  if ((item.jeonseMomPercent ?? 0) >= 20 || (item.saleMomPercent ?? 0) >= 20) {
    return "거래 움직임이 살아나 입주·이사 수요 점검이 필요합니다.";
  }
  return "기본 수요는 있으나 광고비와 경쟁 강도를 함께 확인하세요.";
}

function scopeLabel(scope: ScopeOption): string {
  if (scope.kind === "city") {
    return formatDemandRegionLabel({ scope: "city", cityId: scope.cityId }) ?? scope.cityId;
  }
  return "전국";
}

function reportTitle(scope: ScopeOption, periodKey: string): string {
  const label = scopeLabel(scope);
  if (scope.kind === "national") return `${periodKey} 입주청소 영업 추천 지역 TOP 10`;
  return `${periodKey} ${label} 입주청소 영업 추천 지역`;
}

function periodKeyForMonth(yyyymm: string | null, at: Date): string {
  if (yyyymm) return yyyymm;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(at);
}

async function latestKeywordMonths(
  supabase: SupabaseClient,
  regionKeys: string[]
): Promise<{ current: string | null; previous: string | null }> {
  const { data } = await supabase
    .from("demand_keyword_monthly")
    .select("yyyymm")
    .eq("keyword_key", "move_in_clean")
    .eq("region_scope", "district")
    .in("region_key", regionKeys)
    .order("yyyymm", { ascending: false })
    .limit(500);
  const months = [...new Set((data ?? []).map((row) => String(row.yyyymm)))].sort().reverse();
  return { current: months[0] ?? null, previous: months[1] ?? null };
}

async function latestRtmsMonths(
  supabase: SupabaseClient,
  regionKeys: string[]
): Promise<{ current: string | null; previous: string | null }> {
  const { data } = await supabase
    .from("demand_rtms_monthly")
    .select("yyyymm")
    .eq("region_scope", "district")
    .in("region_key", regionKeys)
    .order("yyyymm", { ascending: false })
    .limit(500);
  const months = [...new Set((data ?? []).map((row) => String(row.yyyymm)))].sort().reverse();
  return { current: months[0] ?? null, previous: months[1] ?? null };
}

function mapByRegionAndMonth<T extends { region_key: string; yyyymm: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [`${row.region_key}:${row.yyyymm}`, row]));
}

export async function buildDemandSalesRegionReportSnapshot(
  supabase: SupabaseClient,
  options: { scope?: ScopeOption; at?: Date } = {}
): Promise<DemandSalesRegionReportSnapshot | null> {
  const at = options.at ?? new Date();
  const scope = options.scope ?? { kind: "national" as const };
  const targets = listAllDistrictKeywordTargets(scope.kind === "city" ? scope.cityId : undefined);
  if (targets.length === 0) return null;

  const regionKeys = targets.map((target) => target.regionKey);
  const [keywordMonths, rtmsMonths] = await Promise.all([
    latestKeywordMonths(supabase, regionKeys),
    latestRtmsMonths(supabase, regionKeys),
  ]);

  const keywordMonthFilter = [keywordMonths.current, keywordMonths.previous].filter((v): v is string => Boolean(v));
  const rtmsMonthFilter = [rtmsMonths.current, rtmsMonths.previous].filter((v): v is string => Boolean(v));
  if (keywordMonthFilter.length === 0 && rtmsMonthFilter.length === 0) return null;

  const [{ data: keywordRows }, { data: rtmsRows }] = await Promise.all([
    keywordMonthFilter.length
      ? supabase
          .from("demand_keyword_monthly")
          .select("region_key, yyyymm, search_volume_month, search_volume_below_ten")
          .eq("keyword_key", "move_in_clean")
          .eq("region_scope", "district")
          .in("region_key", regionKeys)
          .in("yyyymm", keywordMonthFilter)
      : Promise.resolve({ data: [] as KeywordMonthlyRow[] }),
    rtmsMonthFilter.length
      ? supabase
          .from("demand_rtms_monthly")
          .select("region_key, yyyymm, sale_count, jeonse_count")
          .eq("region_scope", "district")
          .in("region_key", regionKeys)
          .in("yyyymm", rtmsMonthFilter)
      : Promise.resolve({ data: [] as RtmsMonthlyRow[] }),
  ]);

  const keywordByKey = mapByRegionAndMonth((keywordRows ?? []) as KeywordMonthlyRow[]);
  const rtmsByKey = mapByRegionAndMonth((rtmsRows ?? []) as RtmsMonthlyRow[]);

  const volumes = targets
    .map((target) => {
      const row = keywordMonths.current ? keywordByKey.get(`${target.regionKey}:${keywordMonths.current}`) : undefined;
      return row?.search_volume_month != null && !row.search_volume_below_ten ? Number(row.search_volume_month) : null;
    })
    .filter((value): value is number => value != null && Number.isFinite(value));
  const trades = targets
    .map((target) => {
      const row = rtmsMonths.current ? rtmsByKey.get(`${target.regionKey}:${rtmsMonths.current}`) : undefined;
      return Number(row?.sale_count ?? 0) + Number(row?.jeonse_count ?? 0);
    })
    .filter((value) => Number.isFinite(value));
  const minVolume = volumes.length ? Math.min(...volumes) : 0;
  const maxVolume = volumes.length ? Math.max(...volumes) : 1;
  const minTrade = trades.length ? Math.min(...trades) : 0;
  const maxTrade = trades.length ? Math.max(...trades) : 1;

  const items = targets
    .map((target) => {
      const selection: DemandRegionSelection = {
        scope: "district",
        cityId: target.cityId,
        guSlug: target.guSlug,
      };
      const label = formatDemandRegionLabel(selection) ?? `${target.cityId} ${target.guName}`;
      const currentKeyword = keywordMonths.current ? keywordByKey.get(`${target.regionKey}:${keywordMonths.current}`) : undefined;
      const previousKeyword = keywordMonths.previous ? keywordByKey.get(`${target.regionKey}:${keywordMonths.previous}`) : undefined;
      const currentRtms = rtmsMonths.current ? rtmsByKey.get(`${target.regionKey}:${rtmsMonths.current}`) : undefined;
      const previousRtms = rtmsMonths.previous ? rtmsByKey.get(`${target.regionKey}:${rtmsMonths.previous}`) : undefined;

      const searchVolume =
        currentKeyword?.search_volume_month != null && !currentKeyword.search_volume_below_ten
          ? Number(currentKeyword.search_volume_month)
          : null;
      const prevVolume =
        previousKeyword?.search_volume_month != null && !previousKeyword.search_volume_below_ten
          ? Number(previousKeyword.search_volume_month)
          : null;
      const saleCount = Number(currentRtms?.sale_count ?? 0);
      const jeonseCount = Number(currentRtms?.jeonse_count ?? 0);
      const prevSale = Number(previousRtms?.sale_count ?? 0);
      const prevJeonse = Number(previousRtms?.jeonse_count ?? 0);
      const searchMomPercent = normalizePercent(searchVolume, prevVolume);
      const saleMomPercent = normalizePercent(saleCount, prevSale);
      const jeonseMomPercent = normalizePercent(jeonseCount, prevJeonse);
      const tradeTotal = saleCount + jeonseCount;
      const score =
        minMaxScore(searchVolume ?? 0, minVolume, maxVolume, 40) +
        growthScore(searchMomPercent, 20) +
        minMaxScore(tradeTotal, minTrade, maxTrade, 25) +
        (confidenceFor({
          searchVolume,
          saleCount,
          jeonseCount,
          hasPreviousKeyword: prevVolume != null,
          hasCurrentRtms: Boolean(currentRtms),
        }) === "high"
          ? 15
          : confidenceFor({
              searchVolume,
              saleCount,
              jeonseCount,
              hasPreviousKeyword: prevVolume != null,
              hasCurrentRtms: Boolean(currentRtms),
            }) === "medium"
            ? 9
            : 4);

      const confidence = confidenceFor({
        searchVolume,
        saleCount,
        jeonseCount,
        hasPreviousKeyword: prevVolume != null,
        hasCurrentRtms: Boolean(currentRtms),
      });
      return {
        rank: 0,
        label,
        cityLabel: formatDemandRegionLabel({ scope: "city", cityId: target.cityId }) ?? target.cityId,
        regionKey: target.regionKey,
        score: Math.max(0, Math.min(100, score)),
        searchVolume,
        searchMomPercent,
        saleCount,
        saleMomPercent,
        jeonseCount,
        jeonseMomPercent,
        dataConfidence: confidence,
        recommendation: "",
      } satisfies DemandSalesRegionReportItem;
    })
    .filter((item) => item.searchVolume != null || item.saleCount + item.jeonseCount > 0)
    .sort((a, b) => b.score - a.score)
    .map((item, index) => {
      const withRank = { ...item, rank: index + 1 };
      return { ...withRank, recommendation: recommendationFor(withRank) };
    });

  if (items.length === 0) return null;

  const topRegions = items.slice(0, REPORT_REGION_LIMIT);
  const risingRegions = [...items]
    .filter((item) => (item.searchMomPercent ?? -Infinity) > 0)
    .sort((a, b) => (b.searchMomPercent ?? -999) - (a.searchMomPercent ?? -999))
    .slice(0, 3);
  const cautionRegions = [...items]
    .filter((item) => item.searchVolume != null && (item.searchMomPercent ?? 0) < 0)
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, 3);

  const periodKey = `${periodKeyForMonth(keywordMonths.current ?? rtmsMonths.current, at)}:${scope.kind === "city" ? scope.cityId : "national"}`;
  const baseYyyymm = keywordMonths.current ?? rtmsMonths.current;
  const baseMonthLabel = monthLabel(baseYyyymm);
  const title = reportTitle(scope, baseMonthLabel);
  const top = topRegions[0];
  const scopeName = scopeLabel(scope);
  const keyMetrics = [
    top ? `${scopeName} 기준 1위는 ${top.label}, 영업기회점수 ${top.score}점입니다.` : `${scopeName} 기준 추천 지역을 산정했습니다.`,
    `${baseMonthLabel} 입주청소 검색량과 RTMS 매매·전세 거래 신호를 함께 반영했습니다.`,
    risingRegions[0]
      ? `${risingRegions[0].label}은 검색량 변화가 ${risingRegions[0].searchMomPercent != null ? `${risingRegions[0].searchMomPercent > 0 ? "+" : ""}${risingRegions[0].searchMomPercent}%` : "확인 필요"}로 가장 눈에 띕니다.`
      : "상승 지역은 추가 데이터가 쌓이면 더 정교하게 분리됩니다.",
  ];

  const content: DemandSalesRegionReportContent = {
    report_kind: REPORT_TYPE_DEMAND_SALES_REGION,
    period_key: periodKey,
    base_yyyymm: baseYyyymm,
    base_month_label: baseMonthLabel,
    scope_label: scopeName,
    generated_at: at.toISOString(),
    headline: top
      ? `${baseMonthLabel} ${scopeName} 입주청소 영업은 ${top.label}을 먼저 확인할 만합니다.`
      : `${baseMonthLabel} ${scopeName} 입주청소 영업 추천 지역입니다.`,
    key_metrics: keyMetrics,
    top_regions: topRegions,
    rising_regions: risingRegions,
    caution_regions: cautionRegions,
    scoring_note:
      "영업기회점수는 입주청소 검색량 40점, 검색량 상승률 20점, RTMS 매매·전세 거래 신호 25점, 데이터 신뢰도 15점으로 계산했습니다. 경쟁 업체 수와 광고 단가는 아직 반영하지 않은 1차 지표입니다.",
    sales_strategy: [
      "상위 지역은 네이버 플레이스, 블로그, 당근, 맘카페 홍보를 같은 주에 묶어서 테스트하세요.",
      "검색량은 높지만 하락 중인 지역은 광고비를 크게 쓰기보다 기존 후기와 포트폴리오 노출을 먼저 점검하세요.",
      "RTMS 전세 거래가 늘어난 지역은 이사·입주 준비 수요가 뒤따를 수 있으므로 2~4주 선행 홍보가 유리합니다.",
    ],
    faq: [
      {
        question: "입주청소 영업지역은 검색량만 보면 되나요?",
        answer:
          "검색량만 보면 경쟁이 심한 지역을 과대평가할 수 있습니다. 클린아이덱스는 검색량과 RTMS 거래 신호를 함께 보고 실제 이사·입주 움직임이 있는 지역을 우선 확인합니다.",
      },
      {
        question: "영업기회점수가 높으면 바로 광고를 집행해도 되나요?",
        answer:
          "점수는 후보 지역을 좁히는 기준입니다. 실제 광고 전에는 네이버 플레이스 경쟁, 후기 수, 단지 입주 일정, 업체 이동 거리까지 함께 확인하는 것이 좋습니다.",
      },
      {
        question: "데이터가 부족한 지역은 어떻게 봐야 하나요?",
        answer:
          "검색량이 10회 미만이거나 RTMS 신호가 부족한 지역은 점수가 낮게 잡힐 수 있습니다. 이런 지역은 주변 시군구와 묶어서 테스트하는 편이 안전합니다.",
      },
    ],
    cta: "클린아이덱스 입주레이더에서 지역별 검색량과 거래 신호를 확인하고, 이번 달 영업 후보 지역을 비교해 보세요.",
    data_trust: {
      source: "입주레이더 검색량, RTMS 지역 거래량",
      sample_count: items.length,
    },
    tags: ["입주청소", "영업지역", "입주레이더", "검색량", "RTMS"],
  };

  return {
    report_type: REPORT_TYPE_DEMAND_SALES_REGION,
    period_key: content.period_key,
    title,
    content_full: content,
    content_summary: {
      ...content,
      top_regions: topRegions.slice(0, 5),
      rising_regions: risingRegions.slice(0, 2),
      caution_regions: cautionRegions.slice(0, 2),
    },
    content_social: `${title}\n\n${content.key_metrics?.slice(0, 2).join("\n") ?? content.headline}`,
    sample_count: items.length,
  };
}
