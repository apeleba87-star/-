import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { getKstDateString } from "@/lib/content/kst-utils";
import { GENERATOR_VERSION } from "@/lib/content/content-generation-runs";

export const MOVE_RTM_SEO_SOURCE_TYPE = "move_rtms_seo";
export const MOVE_RTM_SEO_RUN_TYPE = "move_rtms_daily";

const DEFAULT_DAILY_LIMIT = 5;
const SOURCE_PAGE_SIZE = 250;
const MAX_ROWS_PER_SOURCE = 750;
const MIN_REGION_DEALS = 8;
const MIN_QUALITY_SAMPLE_SIZE = 7;
const OUTLIER_MAX_MEDIAN_RATIO = 0.55;
const OUTLIER_MIN_ABSOLUTE_GAP = 100_000_000;
const DEAL_TYPES: DealType[] = ["jeonse", "monthly", "sale"];
const HOUSING_TYPES: HousingType[] = ["apartment", "villa", "officetel", "detached_multi"];

type RtmsDealRow = {
  id: number;
  housing_type: string | null;
  deal_type: string | null;
  region_key: string | null;
  city_id: string | null;
  city_label: string | null;
  district_slug: string | null;
  district_label: string | null;
  dong: string | null;
  building_name: string | null;
  deal_yyyymm: string | null;
  deal_date: string | null;
  amount_krw: number | null;
  monthly_rent_krw: number | null;
  area_sqm: number | string | null;
  raw?: Record<string, unknown> | null;
};

type DealType = "sale" | "jeonse" | "monthly";
type HousingType = "apartment" | "villa" | "officetel" | "detached_multi";
type TopicKind = "region_price" | "budget_fit" | "region_compare" | "price_caution";

type CleanDeal = {
  id: number;
  housingType: HousingType;
  dealType: DealType;
  regionKey: string;
  cityId: string;
  cityLabel: string;
  districtSlug: string;
  districtLabel: string;
  dong: string;
  buildingName: string;
  dealMonth: string;
  dealDate: string;
  amount: number;
  monthlyRent: number | null;
  areaSqm: number | null;
  isRenewal: boolean;
  quality?: "normal" | "caution" | "outlier";
  representativeExcluded?: boolean;
};

type RegionGroup = {
  key: string;
  cityId: string;
  cityLabel: string;
  districtSlug: string;
  districtLabel: string;
  dong: string;
  deals: CleanDeal[];
};

type SeoTopic = {
  kind: TopicKind;
  sourceRef: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  sourceCount: number;
  payload: Record<string, unknown>;
};

type SeoBlogContent = {
  kind: TopicKind;
  place: string;
  title: string;
  intro: string;
  summary: string[];
  toc: string[];
  sections: {
    id: string;
    title: string;
    paragraphs: string[];
    tone?: "default" | "summary" | "caution" | "examples";
  }[];
  cta: {
    title: string;
    description: string;
    href: string;
    label: string;
  };
};

type JobResult =
  | {
      ok: true;
      skipped: false;
      run_key: string;
      created: number;
      updated: number;
      skipped_existing: number;
      post_ids: string[];
      topics: string[];
      message: string;
    }
  | { ok: true; skipped: true; run_key: string; reason: string; message: string }
  | { ok: false; run_key?: string; error: string };

function isDealType(value: string | null): value is DealType {
  return value === "sale" || value === "jeonse" || value === "monthly";
}

function isHousingType(value: string | null): value is HousingType {
  return value === "apartment" || value === "villa" || value === "officetel" || value === "detached_multi";
}

function numberValue(value: number | string | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readRawText(raw: Record<string, unknown> | null, keys: string[]): string {
  if (!raw) return "";
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function isRenewalDeal(raw: Record<string, unknown> | null): boolean {
  return readRawText(raw, ["contractType", "계약구분", "contractGbn", "cntrctType", "rentContractType"]).includes("갱신");
}

function toCleanDeal(row: RtmsDealRow): CleanDeal | null {
  if (!isDealType(row.deal_type) || !isHousingType(row.housing_type)) return null;
  const amount = Number(row.amount_krw ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const dealDate = row.deal_date?.slice(0, 10) ?? "";
  const dealMonth = row.deal_yyyymm ?? dealDate.slice(0, 7);
  if (!dealDate || !dealMonth) return null;
  return {
    id: row.id,
    housingType: row.housing_type,
    dealType: row.deal_type,
    regionKey: row.region_key ?? "",
    cityId: row.city_id ?? "",
    cityLabel: row.city_label ?? "",
    districtSlug: row.district_slug ?? "",
    districtLabel: row.district_label ?? "",
    dong: row.dong?.trim() || "동명 미상",
    buildingName: row.building_name?.trim() || "단지명 미상",
    dealMonth,
    dealDate,
    amount,
    monthlyRent: row.monthly_rent_krw == null ? null : Number(row.monthly_rent_krw),
    areaSqm: numberValue(row.area_sqm),
    isRenewal: isRenewalDeal(row.raw ?? null),
  };
}

function monthsAgoDate(months: number): string {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const date = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() - months, 1));
  return date.toISOString().slice(0, 10);
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
}

function median(values: number[]): number {
  return percentile(values, 0.5);
}

function areaBand(areaSqm: number | null): string {
  if (areaSqm == null || areaSqm <= 0) return "unknown";
  if (areaSqm < 40) return "under40";
  if (areaSqm < 60) return "40to60";
  if (areaSqm <= 85) return "60to85";
  if (areaSqm <= 102) return "85to102";
  return "over102";
}

function qualityStatsKey(deal: CleanDeal, scope: "building" | "dong"): string {
  const place = scope === "building" ? deal.buildingName : `${deal.cityLabel}:${deal.districtLabel}:${deal.dong}`;
  return [scope, place, deal.housingType, deal.dealType, areaBand(deal.areaSqm)].join(":");
}

function buildQualityStats(deals: CleanDeal[], scope: "building" | "dong"): Map<string, { median: number; lowerFence: number }> {
  const byKey = new Map<string, number[]>();
  for (const deal of deals) {
    if (deal.dealType === "monthly") continue;
    const key = qualityStatsKey(deal, scope);
    byKey.set(key, [...(byKey.get(key) ?? []), deal.amount]);
  }
  const stats = new Map<string, { median: number; lowerFence: number }>();
  for (const [key, values] of byKey.entries()) {
    if (values.length < MIN_QUALITY_SAMPLE_SIZE) continue;
    const sorted = values.filter((value) => value > 0).sort((a, b) => a - b);
    const q1 = percentile(sorted, 0.25);
    const q3 = percentile(sorted, 0.75);
    const mid = percentile(sorted, 0.5);
    const iqr = q3 - q1;
    stats.set(key, { median: mid, lowerFence: iqr > 0 ? q1 - iqr * 1.5 : mid * 0.7 });
  }
  return stats;
}

function markDealQuality(deals: CleanDeal[]): CleanDeal[] {
  const buildingStats = buildQualityStats(deals, "building");
  const dongStats = buildQualityStats(deals, "dong");
  return deals.map((deal) => {
    if (deal.dealType === "monthly") return { ...deal, quality: "normal" as const };
    const stats = buildingStats.get(qualityStatsKey(deal, "building")) ?? dongStats.get(qualityStatsKey(deal, "dong"));
    if (!stats || stats.median <= 0) return { ...deal, quality: "normal" as const };
    const ratio = deal.amount / stats.median;
    const gap = stats.median - deal.amount;
    const belowFence = deal.amount < stats.lowerFence;
    if (ratio <= OUTLIER_MAX_MEDIAN_RATIO && gap >= OUTLIER_MIN_ABSOLUTE_GAP && belowFence) {
      return { ...deal, quality: "outlier" as const, representativeExcluded: true };
    }
    return { ...deal, quality: "normal" as const };
  });
}

function formatKrw(value: number): string {
  const rounded = Math.round(value / 10_000_000) * 10_000_000;
  const eok = Math.floor(rounded / 100_000_000);
  const man = Math.round((rounded % 100_000_000) / 10_000);
  if (eok > 0 && man > 0) return `${eok}억${man.toLocaleString("ko-KR")}만`;
  if (eok > 0) return `${eok}억`;
  return `${Math.max(1, Math.round(rounded / 10_000)).toLocaleString("ko-KR")}만`;
}

function formatMonthly(value: number | null): string {
  if (value == null || value <= 0) return "-";
  return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만`;
}

function formatArea(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "-";
  return `${Math.round(value * 10) / 10}㎡`;
}

function housingLabel(type: HousingType): string {
  switch (type) {
    case "apartment":
      return "아파트";
    case "villa":
      return "빌라·다세대";
    case "officetel":
      return "오피스텔";
    case "detached_multi":
      return "단독/다가구";
  }
}

function dealLabel(type: DealType): string {
  if (type === "sale") return "매매";
  if (type === "jeonse") return "전세";
  return "월세";
}

function placeLabel(group: RegionGroup): string {
  return `${group.cityLabel} ${group.districtLabel} ${group.dong}`.replace(/\s+/g, " ").trim();
}

function groupDeals(deals: CleanDeal[]): RegionGroup[] {
  const map = new Map<string, RegionGroup>();
  for (const deal of deals) {
    if (!deal.regionKey || !deal.cityId || !deal.districtSlug) continue;
    const key = `${deal.regionKey}:${deal.dong}`;
    const existing = map.get(key);
    if (existing) {
      existing.deals.push(deal);
      continue;
    }
    map.set(key, {
      key,
      cityId: deal.cityId,
      cityLabel: deal.cityLabel,
      districtSlug: deal.districtSlug,
      districtLabel: deal.districtLabel,
      dong: deal.dong,
      deals: [deal],
    });
  }
  return [...map.values()].filter((group) => group.deals.length >= MIN_REGION_DEALS);
}

function stableScore(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

function topicSlug(dayKey: string, topic: TopicKind, group: RegionGroup, suffix: string): string {
  return `move-rtms-${dayKey}-${topic}-${group.cityId}-${group.districtSlug}-${stableScore(`${group.dong}:${suffix}`).toString(36)}`;
}

function minMaxLabel(values: number[]): string {
  if (values.length === 0) return "데이터 부족";
  return `${formatKrw(Math.min(...values))} ~ ${formatKrw(Math.max(...values))}`;
}

function dealSummaryRows(deals: CleanDeal[], limit = 6): string {
  const rows = deals
    .slice()
    .sort((a, b) => b.dealDate.localeCompare(a.dealDate))
    .slice(0, limit)
    .map((deal) => {
      const price =
        deal.dealType === "monthly"
          ? `${formatKrw(deal.amount)} / ${formatMonthly(deal.monthlyRent)}`
          : formatKrw(deal.amount);
      return `${deal.dealDate} · ${deal.buildingName.replace(/\|/g, "·")} · ${housingLabel(deal.housingType)} ${dealLabel(deal.dealType)} · 전용 ${formatArea(deal.areaSqm)} · ${price}`;
    });
  return rows.join("\n");
}

function marketSnapshot(group: RegionGroup): string {
  const byType = (dealType: DealType) => group.deals.filter((deal) => deal.dealType === dealType);
  const jeonse = byType("jeonse").map((deal) => deal.amount);
  const monthly = byType("monthly");
  const sale = byType("sale").map((deal) => deal.amount);
  const monthlyDeposits = monthly.map((deal) => deal.amount);
  const monthlyRents = monthly.map((deal) => deal.monthlyRent ?? 0).filter((value) => value > 0);
  return [
    `전세: ${minMaxLabel(jeonse)} · 표본 ${jeonse.length.toLocaleString("ko-KR")}건`,
    `월세 보증금: ${minMaxLabel(monthlyDeposits)} · 표본 ${monthly.length.toLocaleString("ko-KR")}건`,
    `월세: ${monthlyRents.length ? `${formatMonthly(Math.min(...monthlyRents))} ~ ${formatMonthly(Math.max(...monthlyRents))}` : "데이터 부족"} · 표본 ${monthlyRents.length.toLocaleString("ko-KR")}건`,
    `매매: ${minMaxLabel(sale)} · 표본 ${sale.length.toLocaleString("ko-KR")}건`,
  ].join("\n");
}

function recentDateLabel(deals: CleanDeal[]): string {
  return deals.map((deal) => deal.dealDate).sort().at(-1) ?? "최근 수집일";
}

function housingMixLabel(deals: CleanDeal[]): string {
  const counts = new Map<HousingType, number>();
  for (const deal of deals) counts.set(deal.housingType, (counts.get(deal.housingType) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${housingLabel(type)} ${count.toLocaleString("ko-KR")}건`)
    .join(", ") || "주택 유형 표본 부족";
}

function buildSeoBlogBody(options: {
  label: string;
  intro: string;
  summary: string[];
  flow: string;
  interpretation: string;
  dealExamples: string[];
  caution: string;
  nextAction: string;
}): { body: string; content: Omit<SeoBlogContent, "kind" | "title"> } {
  const toc = [
    `${options.label} 최근 거래 흐름`,
    "가격 범위 한눈에 보기",
    "주택 유형별로 다르게 봐야 할 점",
    "최근 참고 거래 예시",
    "실거래가를 볼 때 주의할 점",
    "이사 전 확인하면 좋은 내용",
  ];
  const sections: SeoBlogContent["sections"] = [
    {
      id: "recent-flow",
      title: toc[0],
      paragraphs: [
        options.flow,
        "최근 거래 흐름은 매물 호가가 아니라 실제 신고된 거래를 기준으로 봐야 합니다. 그래서 현재 매물 가격과 완전히 같지는 않을 수 있지만, 예산을 잡을 때 기준점으로 삼기에는 유용합니다.",
      ],
    },
    {
      id: "price-summary",
      title: toc[1],
      tone: "summary",
      paragraphs: [
        ...options.summary,
        "같은 동 안에서도 전용면적, 건물 연식, 층수, 주차 가능 여부에 따라 체감 가격은 달라질 수 있습니다. 숫자는 방향을 잡는 참고값으로 보고, 실제 선택 전에는 조건을 다시 확인하는 것이 좋습니다.",
      ],
    },
    {
      id: "housing-type",
      title: toc[2],
      paragraphs: [
        options.interpretation,
        "아파트는 단지명과 전용면적을 같이 봐야 하고, 오피스텔은 보증금보다 월세 부담이 더 중요할 때가 많습니다. 빌라·다세대는 같은 금액이라도 건물 상태와 역과의 거리 차이가 큽니다.",
        "단독/다가구 거래는 방 구조와 관리 상태가 다양하기 때문에 실거래 금액을 참고하되 현장 확인이 더 중요합니다.",
      ],
    },
    {
      id: "deal-examples",
      title: toc[3],
      tone: "examples",
      paragraphs: [
        ...options.dealExamples,
        "위 거래들은 가격 감을 잡기 위한 예시입니다. 같은 지역의 모든 매물이 이 가격이라는 뜻은 아니며, 최근 거래 중 일부를 보기 쉽게 정리한 것입니다.",
      ],
    },
    {
      id: "caution",
      title: toc[4],
      tone: "caution",
      paragraphs: [
        options.caution,
        "실거래가에는 신규계약, 갱신계약, 특수한 조건의 거래가 함께 섞일 수 있습니다. 특히 월세는 보증금만 낮게 보이면 저렴해 보이지만 실제로는 월세 부담이 클 수 있습니다.",
        "보증금이 1억 원 이상인 월세는 반전세 성격이 강할 수 있어 전세와 단순 비교하면 혼란이 생깁니다.",
      ],
    },
    {
      id: "next-step",
      title: toc[5],
      paragraphs: [
        options.nextAction,
        "이사를 준비할 때는 집값만 보는 것보다 출퇴근 동선, 관리비, 주차, 주변 생활 편의시설, 입주청소 가능 일정까지 함께 보는 것이 좋습니다.",
      ],
    },
  ];
  const body = [
    options.intro,
    `목차\n${toc.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
    ...sections.map((section) => [section.title, ...section.paragraphs].join("\n\n")),
  ].join("\n\n");
  return {
    body,
    content: {
      place: options.label,
      intro: options.intro,
      summary: options.summary,
      toc,
      sections,
      cta: {
        title: "내 예산으로 갈 수 있는 동네를 바로 확인하세요",
        description:
          "보증금과 월세 조건을 입력하면 최근 실거래가 기준으로 갈 수 있는 지역과 주택 유형을 찾아볼 수 있습니다.",
        href: "/move",
        label: "이사검색 바로가기",
      },
    },
  };
}

function blogPayload(kind: TopicKind, title: string, content: Omit<SeoBlogContent, "kind" | "title">, extra: Record<string, unknown>): Record<string, unknown> {
  return [
    ["kind", kind],
    ["title", title],
    ...Object.entries(content),
    ...Object.entries(extra),
  ].reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}

function buildRegionPriceTopic(group: RegionGroup, dayKey: string): SeoTopic | null {
  const targetDeals = group.deals.filter((deal) => (deal.dealType === "jeonse" || deal.dealType === "monthly") && !deal.representativeExcluded);
  if (targetDeals.length < MIN_REGION_DEALS) return null;
  const label = placeLabel(group);
  const jeonse = targetDeals.filter((deal) => deal.dealType === "jeonse").map((deal) => deal.amount);
  const monthly = targetDeals.filter((deal) => deal.dealType === "monthly");
  const title = `${label} 전세·월세 시세 정리 — 최근 실거래 기준`;
  const excerpt = `${label} 최근 실거래를 기준으로 전세·월세 가격 범위와 주택 유형별 선택지를 정리했습니다.`;
  const blog = buildSeoBlogBody({
    label,
    intro: `${label}로 이사를 고민한다면 가장 먼저 확인해야 할 것은 최근에 실제로 거래된 전세·월세 가격입니다. 이 글은 최근 RTMS 실거래 데이터를 바탕으로 ${label}에서 확인된 거래 범위와 주택 유형별 차이를 정리한 이사 정보 글입니다. 단순히 가장 낮은 금액 한 건만 보여주기보다, 여러 거래를 함께 보고 예산을 잡을 수 있도록 구성했습니다.`,
    summary: marketSnapshot(group).split("\n").filter(Boolean),
    flow: `${label}의 최근 참고 가능한 전월세 거래 표본은 ${targetDeals.length.toLocaleString("ko-KR")}건입니다. 가장 최근에 확인된 거래일은 ${recentDateLabel(targetDeals)}이며, 주택 유형은 ${housingMixLabel(targetDeals)}으로 구성되어 있습니다. 전세와 월세가 함께 확인되는 지역이라면 보증금만 비교하기보다 월세 부담까지 같이 보는 것이 좋습니다.`,
    interpretation: jeonse.length
      ? `전세는 ${formatKrw(percentile(jeonse, 0.25))}부터 ${formatKrw(percentile(jeonse, 0.75))} 사이의 거래가 현실적인 참고 구간으로 보입니다. 월세 표본은 ${monthly.length.toLocaleString("ko-KR")}건이며, 같은 보증금이라도 월세가 크게 달라질 수 있어 월세 상한을 따로 정하는 것이 좋습니다.`
      : `전세 표본은 많지 않아 월세 거래와 주변 동의 거래를 함께 보는 편이 좋습니다. 월세 표본은 ${monthly.length.toLocaleString("ko-KR")}건이며, 낮은 보증금 거래일수록 월세 부담을 반드시 같이 확인해야 합니다.`,
    dealExamples: dealSummaryRows(targetDeals).split("\n").filter(Boolean),
    caution: `${label}의 최저 거래는 눈에 띄지만, 그것만으로 지역 시세를 판단하면 위험합니다. 갱신계약이거나 면적이 작은 거래, 건물 상태가 다른 거래일 수 있기 때문입니다. 전용면적과 주택 유형을 함께 보고, 최근 거래 여러 건의 범위를 기준으로 판단하는 것이 안전합니다.`,
    nextAction: `${group.districtLabel} 안에서도 동마다 가격 차이가 큽니다. 예산이 정해져 있다면 클린아이덱스 이사검색에서 보증금과 월세 상한을 넣고, ${label}뿐 아니라 주변 동까지 함께 확인해 보세요.`,
  });
  return {
    kind: "region_price",
    sourceRef: `${dayKey}:region:${group.key}`,
    title,
    slug: topicSlug(dayKey, "region_price", group, "rent"),
    excerpt,
    body: blog.body,
    sourceCount: targetDeals.length,
    payload: blogPayload("region_price", title, blog.content, { region_key: group.key }),
  };
}

function buildBudgetFitTopic(group: RegionGroup, dayKey: string): SeoTopic | null {
  const rentDeals = group.deals.filter((deal) => (deal.dealType === "jeonse" || deal.dealType === "monthly") && !deal.representativeExcluded);
  if (rentDeals.length < MIN_REGION_DEALS) return null;
  const amounts = rentDeals.map((deal) => deal.amount).sort((a, b) => a - b);
  const budget = percentile(amounts, 0.35);
  if (budget <= 0) return null;
  const affordable = rentDeals.filter((deal) => deal.amount <= budget).slice(0, 15);
  if (affordable.length < 4) return null;
  const label = placeLabel(group);
  const title = `${formatKrw(budget)} 예산으로 ${label}에서 가능한 집은?`;
  const excerpt = `${formatKrw(budget)} 안팎의 예산으로 ${label}에서 확인된 최근 전세·월세 실거래 후보를 정리했습니다.`;
  const blog = buildSeoBlogBody({
    label,
    intro: `${formatKrw(budget)} 안팎의 예산으로 ${label}에서 집을 찾을 수 있는지 궁금한 사용자를 위해 최근 실거래를 기준으로 가능한 후보를 정리했습니다. 이 글은 매물 광고가 아니라 실제 신고된 거래를 바탕으로 예산 판단을 돕는 이사 정보 글입니다. 같은 예산이라도 전세인지 월세인지, 아파트인지 오피스텔인지에 따라 선택지가 완전히 달라질 수 있습니다.`,
    summary: [
      `기준 예산: ${formatKrw(budget)}`,
      `예산 안에 들어온 최근 거래: ${affordable.length.toLocaleString("ko-KR")}건`,
      `전체 참고 표본: ${rentDeals.length.toLocaleString("ko-KR")}건`,
      `가장 최근 거래일: ${recentDateLabel(rentDeals)}`,
      `주택 유형 구성: ${housingMixLabel(affordable)}`,
    ],
    flow: `${label}에서는 최근 전월세 거래 중 ${affordable.length.toLocaleString("ko-KR")}건이 ${formatKrw(budget)} 이하 조건에 들어왔습니다. 다만 이 숫자는 예산 안에 들어오는 거래가 있었다는 뜻이지, 현재 같은 조건의 매물이 항상 있다는 뜻은 아닙니다. 예산을 정할 때는 최저가보다 반복적으로 확인되는 가격대를 기준으로 보는 것이 좋습니다.`,
    interpretation: `${formatKrw(budget)} 이하 거래는 면적이 작거나 월세 부담이 있는 경우가 많습니다. 전세라면 보증금 전액을 기준으로 보면 되지만, 월세라면 보증금과 월세를 동시에 봐야 합니다. 보증금이 낮아 보여도 월세가 높으면 실제 매달 부담은 커질 수 있습니다.`,
    dealExamples: dealSummaryRows(affordable).split("\n").filter(Boolean),
    caution: `${formatKrw(budget)} 이하 거래가 있어도 같은 동의 모든 집이 그 예산 안에 들어온다는 뜻은 아닙니다. 갱신계약, 작은 전용면적, 저층 또는 건물 상태 차이 때문에 낮은 가격이 나올 수 있습니다. 따라서 예산형 검색에서는 금액뿐 아니라 면적과 주택 유형을 함께 확인해야 합니다.`,
    nextAction: `이 예산이 빠듯하게 느껴진다면 같은 ${group.districtLabel} 안의 다른 동이나 월세 조건을 함께 보는 것이 좋습니다. 클린아이덱스 이사검색에서는 보증금과 월세 범위를 동시에 조정해 실제 갈 수 있는 후보를 확인할 수 있습니다.`,
  });
  return {
    kind: "budget_fit",
    sourceRef: `${dayKey}:budget:${group.key}:${Math.round(budget / 10_000_000)}`,
    title,
    slug: topicSlug(dayKey, "budget_fit", group, String(Math.round(budget / 10_000_000))),
    excerpt,
    body: blog.body,
    sourceCount: affordable.length,
    payload: blogPayload("budget_fit", title, blog.content, { region_key: group.key, budget }),
  };
}

function buildCautionTopic(group: RegionGroup, dayKey: string): SeoTopic | null {
  const rentDeals = group.deals.filter((deal) => deal.dealType === "jeonse" || deal.dealType === "monthly");
  const qualityDeals = rentDeals.filter((deal) => deal.representativeExcluded);
  if (rentDeals.length < MIN_REGION_DEALS) return null;
  const amounts = rentDeals.map((deal) => deal.amount);
  const low = Math.min(...amounts);
  const mid = median(amounts);
  const renewalCount = rentDeals.filter((deal) => deal.isRenewal).length;
  if ((mid <= 0 || low / mid > 0.72) && qualityDeals.length === 0) return null;
  const label = placeLabel(group);
  const title = `${label} 낮은 전월세 거래, 그대로 봐도 될까?`;
  const excerpt = `${label}에서 낮게 보이는 전월세 실거래를 볼 때 갱신계약·반전세·면적 차이를 함께 확인해야 하는 이유를 정리했습니다.`;
  const renewalLine =
    renewalCount > 0
      ? `갱신계약으로 표시된 참고 거래는 ${renewalCount.toLocaleString("ko-KR")}건입니다.`
      : "갱신계약 여부가 비어 있는 거래도 있어 최저가 해석에 주의가 필요합니다.";
  const blog = buildSeoBlogBody({
    label,
    intro: `${label} 실거래를 보다 보면 유독 낮아 보이는 전월세 거래가 눈에 띌 수 있습니다. 하지만 낮은 거래가 있다고 해서 바로 그 금액을 현재 시세로 받아들이면 안 됩니다. 이 글은 ${label}에서 낮게 보이는 거래를 어떻게 해석해야 하는지, 갱신계약과 월세·반전세, 면적 차이를 중심으로 정리한 블로그형 안내 글입니다.`,
    summary: [
      `최근 전월세 최저 거래: ${formatKrw(low)}`,
      `최근 전월세 중간값: ${formatKrw(mid)}`,
      renewalLine,
      `대표가격 제외 후보: ${qualityDeals.length.toLocaleString("ko-KR")}건`,
      `전체 전월세 표본: ${rentDeals.length.toLocaleString("ko-KR")}건`,
      `최근 거래일: ${recentDateLabel(rentDeals)}`,
    ],
    flow: `${label}의 최근 전월세 거래를 보면 최저 거래와 중간 가격 사이에 차이가 있습니다. 최저 거래는 예산을 낮게 잡고 싶은 사용자에게 매력적으로 보일 수 있지만, 실제 신규 계약에서 같은 조건을 찾기 어려울 수 있습니다. 실거래가는 결과값이기 때문에 계약 당시의 특수한 사정이 반영될 수 있습니다.`,
    interpretation: `낮은 거래가 생기는 이유는 여러 가지입니다. 기존 임차인이 갱신한 계약일 수 있고, 전용면적이 작거나 층수와 방향이 불리할 수 있습니다. 월세 거래라면 보증금만 낮게 보여 전세보다 싸 보이지만, 매달 월세를 합치면 실제 부담이 달라집니다. 그래서 낮은 거래는 참고하되 중간값과 최근 거래 여러 건을 함께 봐야 합니다.`,
    dealExamples: dealSummaryRows((qualityDeals.length ? qualityDeals : rentDeals).sort((a, b) => a.amount - b.amount)).split("\n").filter(Boolean),
    caution: `${label}에서 가장 낮은 금액 한 건만 기준으로 삼으면 예산 계획이 흔들릴 수 있습니다. 특히 보증금이 1억 원 이상인 월세는 반전세 성격이 강할 수 있고, 보증금이 매우 낮은 거래는 월세가 높을 가능성이 있습니다. 전세와 월세를 같은 기준으로 비교하지 않도록 주의해야 합니다.`,
    nextAction: `낮은 거래를 봤다면 같은 건물이나 비슷한 전용면적의 다른 거래가 있는지 확인해 보세요. 클린아이덱스 이사검색에서는 가격 범위와 참고 거래를 함께 보여주기 때문에 최저가 하나에 의존하지 않고 현실적인 후보를 찾는 데 도움이 됩니다.`,
  });
  return {
    kind: "price_caution",
    sourceRef: `${dayKey}:caution:${group.key}`,
    title,
    slug: topicSlug(dayKey, "price_caution", group, "caution"),
    excerpt,
    body: blog.body,
    sourceCount: rentDeals.length,
    payload: blogPayload("price_caution", title, blog.content, { region_key: group.key, low, median: mid, renewal_count: renewalCount }),
  };
}

function buildCompareTopic(groups: RegionGroup[], dayKey: string): SeoTopic | null {
  const byDistrict = new Map<string, RegionGroup[]>();
  for (const group of groups) {
    const key = `${group.cityId}:${group.districtSlug}`;
    byDistrict.set(key, [...(byDistrict.get(key) ?? []), group]);
  }
  const district = [...byDistrict.values()]
    .filter((items) => items.length >= 2)
    .sort((a, b) => b.reduce((sum, group) => sum + group.deals.length, 0) - a.reduce((sum, group) => sum + group.deals.length, 0))[0];
  if (!district) return null;
  const selected = district
    .slice()
    .sort((a, b) => b.deals.length - a.deals.length)
    .slice(0, 3);
  if (selected.length < 2) return null;
  const base = selected[0];
  const districtLabel = `${base.cityLabel} ${base.districtLabel}`;
  const title = `${districtLabel} 어느 동이 전월세 선택지가 많을까?`;
  const excerpt = `${districtLabel} 주요 동의 전세·월세 실거래 표본과 가격 범위를 비교했습니다.`;
  const comparison = selected
    .map((group) => {
      const rentDeals = group.deals.filter((deal) => (deal.dealType === "jeonse" || deal.dealType === "monthly") && !deal.representativeExcluded);
      return `${group.dong}: 전월세 표본 ${rentDeals.length.toLocaleString("ko-KR")}건 · 보증금/전세금 범위 ${minMaxLabel(rentDeals.map((deal) => deal.amount))} · 최근 거래일 ${recentDateLabel(rentDeals)}`;
    })
    .join("\n");
  const totalRentDeals = selected.reduce(
    (sum, group) => sum + group.deals.filter((deal) => (deal.dealType === "jeonse" || deal.dealType === "monthly") && !deal.representativeExcluded).length,
    0
  );
  const blog = buildSeoBlogBody({
    label: districtLabel,
    intro: `${districtLabel}로 이사를 고민할 때는 구 전체 평균만 보는 것보다 어느 동에 거래 표본이 많은지 확인하는 것이 중요합니다. 같은 구 안에서도 역세권, 주택 유형, 생활권 차이에 따라 전세·월세 가격과 선택지가 크게 달라질 수 있습니다. 이 글은 최근 RTMS 실거래를 기준으로 ${districtLabel} 안의 주요 동을 비교한 이사 블로그 글입니다.`,
    summary: comparison.split("\n").filter(Boolean),
    flow: `${districtLabel}에서 비교 가능한 전월세 표본은 주요 동 기준 ${totalRentDeals.toLocaleString("ko-KR")}건입니다. 거래 표본이 많은 동은 최근에 실제 계약 사례가 많았다는 뜻이므로 예산을 잡을 때 참고하기 좋습니다. 다만 거래가 많다고 해서 무조건 저렴한 지역이라는 의미는 아닙니다.`,
    interpretation: `${selected.map((group) => group.dong).join(", ")}처럼 같은 구 안에 있는 동들도 가격 범위와 주택 유형이 다릅니다. 어떤 동은 오피스텔이나 소형 주택 거래가 많아 보증금이 낮게 보일 수 있고, 어떤 동은 아파트 전세 비중이 높아 금액대가 올라갈 수 있습니다. 사용자는 자신의 예산과 생활 동선을 함께 놓고 봐야 합니다.`,
    dealExamples: selected
      .flatMap((group) => group.deals.filter((deal) => (deal.dealType === "jeonse" || deal.dealType === "monthly") && !deal.representativeExcluded).slice(0, 3))
      .slice(0, 6)
      .map((deal) => `${deal.dong} · ${dealSummaryRows([deal], 1)}`),
    caution: `동별 비교에서 표본 수가 적은 곳은 좋은 조건이 없다는 뜻이 아니라 최근 신고된 거래가 적다는 뜻일 수 있습니다. 반대로 표본 수가 많은 곳은 선택지가 넓어 보이지만, 가격대가 높거나 월세 부담이 큰 거래가 섞여 있을 수 있습니다. 동별 비교는 방향을 잡는 자료로 보고, 최종 판단은 예산 조건으로 다시 좁혀야 합니다.`,
    nextAction: `${districtLabel} 안에서 후보 동을 고른 뒤에는 보증금과 월세 상한을 넣어 실제 예산에 맞는 후보만 다시 보는 것이 좋습니다. 클린아이덱스 이사검색을 사용하면 같은 구 안에서도 내 예산에 들어오는 동과 주택 유형을 빠르게 비교할 수 있습니다.`,
  });
  return {
    kind: "region_compare",
    sourceRef: `${dayKey}:compare:${base.cityId}:${base.districtSlug}`,
    title,
    slug: topicSlug(dayKey, "region_compare", base, "compare"),
    excerpt,
    body: blog.body,
    sourceCount: selected.reduce((sum, group) => sum + group.deals.length, 0),
    payload: blogPayload("region_compare", title, blog.content, { district: `${base.cityId}:${base.districtSlug}`, dongs: selected.map((g) => g.dong) }),
  };
}

async function fetchRecentRtmsDeals(supabase: SupabaseClient, monthsBack: number): Promise<CleanDeal[]> {
  const cutoff = monthsAgoDate(monthsBack);
  const rows: RtmsDealRow[] = [];
  for (const housingType of HOUSING_TYPES) {
    for (const dealType of DEAL_TYPES) {
      for (let from = 0; from < MAX_ROWS_PER_SOURCE; from += SOURCE_PAGE_SIZE) {
        const { data, error } = await supabase
          .from("demand_rtms_deals")
          .select(
            "id,housing_type,deal_type,region_key,city_id,city_label,district_slug,district_label,dong,building_name,deal_yyyymm,deal_date,amount_krw,monthly_rent_krw,area_sqm"
          )
          .eq("housing_type", housingType)
          .eq("deal_type", dealType)
          .gte("deal_date", cutoff)
          .order("deal_date", { ascending: false })
          .range(from, from + SOURCE_PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        rows.push(...((data as RtmsDealRow[] | null) ?? []));
        if (!data?.length || data.length < SOURCE_PAGE_SIZE) break;
      }
    }
  }
  return markDealQuality(rows.map(toCleanDeal).filter((deal): deal is CleanDeal => Boolean(deal)));
}

function buildTopics(deals: CleanDeal[], options: { dayKey: string; limit: number }): SeoTopic[] {
  const groups = groupDeals(deals)
    .sort((a, b) => b.deals.length - a.deals.length)
    .slice(0, 80);
  const rotated = groups
    .map((group) => ({ group, score: stableScore(`${options.dayKey}:${group.key}`) }))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.group);
  const topics: SeoTopic[] = [];

  for (const group of rotated) {
    const topic = buildRegionPriceTopic(group, options.dayKey);
    if (topic) topics.push(topic);
    if (topics.filter((item) => item.kind === "region_price").length >= 2) break;
  }

  for (const group of rotated) {
    const topic = buildBudgetFitTopic(group, options.dayKey);
    if (topic) {
      topics.push(topic);
      break;
    }
  }

  const compareTopic = buildCompareTopic(groups, options.dayKey);
  if (compareTopic) topics.push(compareTopic);

  for (const group of rotated) {
    const topic = buildCautionTopic(group, options.dayKey);
    if (topic) {
      topics.push(topic);
      break;
    }
  }

  if (topics.length < options.limit) {
    for (const group of rotated) {
      if (topics.length >= options.limit) break;
      const topic = buildRegionPriceTopic(group, options.dayKey);
      if (topic && !topics.some((item) => item.sourceRef === topic.sourceRef)) topics.push(topic);
    }
  }

  return topics.slice(0, options.limit);
}

async function upsertRun(
  supabase: SupabaseClient,
  runKey: string
): Promise<{ ok: true; attemptCount: number } | { ok: false; error: string }> {
  const { data: existingRun } = await supabase
    .from("content_generation_runs")
    .select("id,status,attempt_count")
    .eq("run_type", MOVE_RTM_SEO_RUN_TYPE)
    .eq("run_key", runKey)
    .maybeSingle();
  const attemptCount = Number(existingRun?.attempt_count ?? 0) + 1;
  const { error } = await supabase.from("content_generation_runs").upsert(
    {
      run_type: MOVE_RTM_SEO_RUN_TYPE,
      run_key: runKey,
      status: "pending",
      started_at: new Date().toISOString(),
      attempt_count: attemptCount,
      generator_version: GENERATOR_VERSION,
    },
    { onConflict: "run_type,run_key", ignoreDuplicates: false }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, attemptCount };
}

async function markRun(
  supabase: SupabaseClient,
  runKey: string,
  values: Record<string, unknown>
): Promise<void> {
  await supabase
    .from("content_generation_runs")
    .update({ ...values, finished_at: new Date().toISOString() })
    .eq("run_type", MOVE_RTM_SEO_RUN_TYPE)
    .eq("run_key", runKey);
}

async function saveTopic(
  supabase: SupabaseClient,
  topic: SeoTopic,
  options: { autoPublish: boolean; force: boolean }
): Promise<{ ok: true; postId: string; created: boolean; skippedExisting: boolean } | { ok: false; error: string }> {
  const { data: existingPost, error: existingError } = await supabase
    .from("posts")
    .select("id,published_at")
    .eq("source_type", MOVE_RTM_SEO_SOURCE_TYPE)
    .eq("source_ref", topic.sourceRef)
    .maybeSingle();
  if (existingError) return { ok: false, error: existingError.message };
  if (existingPost?.id && !options.force) {
    return { ok: true, postId: existingPost.id, created: false, skippedExisting: true };
  }

  const payload = {
    title: topic.title,
    slug: topic.slug,
    body: topic.body,
    excerpt: topic.excerpt,
    newsletter_include: false,
    published_at: options.autoPublish ? new Date().toISOString() : (existingPost?.published_at ?? null),
    source_type: MOVE_RTM_SEO_SOURCE_TYPE,
    source_ref: topic.sourceRef,
    report_snapshot: topic.payload,
    updated_at: new Date().toISOString(),
  };

  if (existingPost?.id) {
    const { error } = await supabase.from("posts").update(payload).eq("id", existingPost.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, postId: existingPost.id, created: false, skippedExisting: false };
  }

  const { data: insertedPost, error } = await supabase
    .from("posts")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !insertedPost) return { ok: false, error: error?.message ?? "post insert failed" };
  return { ok: true, postId: insertedPost.id, created: true, skippedExisting: false };
}

export async function runMoveRtmsSeoPostJob(
  supabase: SupabaseClient,
  options: { force?: boolean; autoPublish?: boolean; dailyLimit?: number; monthsBack?: number; at?: Date; dryRun?: boolean } = {}
): Promise<JobResult> {
  const at = options.at ?? new Date();
  const dayKey = getKstDateString(at);
  const runKey = `${dayKey}:move-rtms-seo`;
  const force = options.force === true;
  const autoPublish = options.autoPublish !== false;
  const dryRun = options.dryRun === true;
  const limit = Math.min(Math.max(Math.round(options.dailyLimit ?? DEFAULT_DAILY_LIMIT), 1), 12);
  const monthsBack = Math.min(Math.max(Math.round(options.monthsBack ?? 2), 1), 12);

  if (dryRun) {
    try {
      const deals = await fetchRecentRtmsDeals(supabase, monthsBack);
      const topics = buildTopics(deals, { dayKey, limit });
      if (!topics.length) {
        return {
          ok: true,
          skipped: true,
          run_key: runKey,
          reason: "no_topics",
          message: "dryRun: 생성 가능한 SEO 주제가 없습니다.",
        };
      }
      return {
        ok: true,
        skipped: false,
        run_key: runKey,
        created: 0,
        updated: 0,
        skipped_existing: 0,
        post_ids: [],
        topics: topics.map((topic) => topic.title),
        message: `dryRun: 실거래 기반 SEO 글 ${topics.length}개를 생성할 수 있습니다.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, run_key: runKey, error: message };
    }
  }

  const run = await upsertRun(supabase, runKey);
  if (!run.ok) return { ok: false, run_key: runKey, error: run.error };

  try {
    const deals = await fetchRecentRtmsDeals(supabase, monthsBack);
    if (deals.length < MIN_REGION_DEALS) {
      await markRun(supabase, runKey, {
        status: "skipped",
        source_count: deals.length,
        error_message: null,
        payload: { reason: "not_enough_rtms_deals", monthsBack },
      });
      return {
        ok: true,
        skipped: true,
        run_key: runKey,
        reason: "not_enough_rtms_deals",
        message: "SEO 글을 만들 RTMS 실거래 표본이 부족합니다.",
      };
    }

    const topics = buildTopics(deals, { dayKey, limit });
    if (!topics.length) {
      await markRun(supabase, runKey, {
        status: "skipped",
        source_count: deals.length,
        error_message: null,
        payload: { reason: "no_topics", monthsBack },
      });
      return {
        ok: true,
        skipped: true,
        run_key: runKey,
        reason: "no_topics",
        message: "오늘 발행할 SEO 주제를 찾지 못했습니다.",
      };
    }

    let created = 0;
    let updated = 0;
    let skippedExisting = 0;
    const postIds: string[] = [];
    for (const topic of topics) {
      const saved = await saveTopic(supabase, topic, { autoPublish, force });
      if (!saved.ok) {
        await markRun(supabase, runKey, {
          status: "failed",
          source_count: deals.length,
          error_message: saved.error,
          payload: { failed_topic: topic.sourceRef },
        });
        return { ok: false, run_key: runKey, error: saved.error };
      }
      postIds.push(saved.postId);
      if (saved.skippedExisting) skippedExisting += 1;
      else if (saved.created) created += 1;
      else updated += 1;
    }

    await markRun(supabase, runKey, {
      status: "success",
      source_count: deals.length,
      generated_post_id: postIds[0] ?? null,
      error_message: null,
      payload: {
        monthsBack,
        limit,
        autoPublish,
        created,
        updated,
        skippedExisting,
        topics: topics.map((topic) => ({ kind: topic.kind, title: topic.title, sourceRef: topic.sourceRef })),
      },
    });

    revalidatePath("/news");
    revalidatePath("/");

    return {
      ok: true,
      skipped: false,
      run_key: runKey,
      created,
      updated,
      skipped_existing: skippedExisting,
      post_ids: postIds,
      topics: topics.map((topic) => topic.title),
      message: `실거래 기반 SEO 글 ${created + updated}개를 ${autoPublish ? "발행" : "초안 생성"}했습니다.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markRun(supabase, runKey, {
      status: "failed",
      source_count: 0,
      error_message: message,
    });
    return { ok: false, run_key: runKey, error: message };
  }
}
