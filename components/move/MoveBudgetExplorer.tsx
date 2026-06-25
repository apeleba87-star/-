"use client";

import { useMemo, useState } from "react";
import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";
import type { MoveBudgetCandidate, MoveDealType, MoveHousingType } from "@/lib/move/budget-types";
import { cn } from "@/lib/utils";

type DealType = MoveDealType;
type HousingType = MoveHousingType;

type SearchFilters = {
  dealTypes: DealType[];
  housingTypes: HousingType[];
  regionKeys: string[];
  budgetMin: number;
  budgetMax: number;
  monthlyMin: number;
  monthlyMax: number;
  lookbackMonths: number;
  sortBy: "count" | "lowest" | "area" | "recent";
};

type MoveBudgetResult = {
  candidate: MoveBudgetCandidate;
  dealRows: NonNullable<MoveBudgetCandidate["deals"]>;
  representativeDeal: NonNullable<MoveBudgetCandidate["deals"]>[number];
  hasPriceVariance: boolean;
  hasLowSample: boolean;
};

type DealListSort = "area" | "recent" | "deposit" | "monthly";
type SortDirection = "asc" | "desc";
type DealListSortState = { key: DealListSort; direction: SortDirection };
type ResultSort = "recommended" | "price";

const HOUSING_LABEL: Record<HousingType, string> = {
  apartment: "아파트",
  villa: "빌라/연립",
  officetel: "오피스텔",
  detached_multi: "단독/다가구",
};

const DEAL_LABEL: Record<DealType, string> = {
  jeonse: "전세",
  monthly: "월세",
  sale: "매매",
};

const ALL_REGION_KEY = "all";
const CITY_DISPLAY_ORDER = [
  "seoul",
  "gyeonggi",
  "busan",
  "gyeongnam",
  "incheon",
  "gyeongbuk",
  "daegu",
  "chungnam",
  "jeonbuk",
  "jeonnam",
  "chungbuk",
  "gangwon",
  "daejeon",
  "gwangju",
  "ulsan",
  "jeju",
  "sejong",
];

type RegionOption = {
  key: string;
  cityLabel: string;
  label: string;
};

const REGION_OPTIONS: RegionOption[] = DEMAND_REGION_REGISTRY.flatMap((city) =>
  city.districts.map((district) => ({
    key: `${city.label}:${district.gu}`,
    cityLabel: city.label,
    label: district.gu,
  }))
).sort((a, b) => a.cityLabel.localeCompare(b.cityLabel, "ko-KR") || a.label.localeCompare(b.label, "ko-KR"));
const ORDERED_DEMAND_REGIONS = [...DEMAND_REGION_REGISTRY].sort((a, b) => {
  const aIndex = CITY_DISPLAY_ORDER.indexOf(a.id);
  const bIndex = CITY_DISPLAY_ORDER.indexOf(b.id);
  return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
});

const DUMMY_CANDIDATES: MoveBudgetCandidate[] = [
  {
    id: "yeoksam-villa-jeonse",
    sido: "서울",
    sigungu: "강남구",
    dong: "역삼동",
    housingType: "villa",
    dealType: "jeonse",
    amount: 320_000_000,
    areaSqm: 42.1,
    dealCount: 6,
    recentMonth: "2026-05",
    buildingHint: "다세대·빌라 소형",
  },
  {
    id: "samsung-apt-jeonse",
    sido: "서울",
    sigungu: "강남구",
    dong: "삼성동",
    housingType: "apartment",
    dealType: "jeonse",
    amount: 340_000_000,
    areaSqm: 39.4,
    dealCount: 2,
    recentMonth: "2026-05",
    buildingHint: "소형 아파트",
  },
  {
    id: "hanam-apt-jeonse",
    sido: "경기",
    sigungu: "하남시",
    dong: "망월동",
    housingType: "apartment",
    dealType: "jeonse",
    amount: 335_000_000,
    areaSqm: 51.7,
    dealCount: 12,
    recentMonth: "2026-05",
    buildingHint: "미사권역 아파트",
  },
  {
    id: "namyangju-apt-jeonse",
    sido: "경기",
    sigungu: "남양주시",
    dong: "다산동",
    housingType: "apartment",
    dealType: "jeonse",
    amount: 300_000_000,
    areaSqm: 59.8,
    dealCount: 18,
    recentMonth: "2026-05",
    buildingHint: "다산신도시 아파트",
  },
  {
    id: "gimpo-apt-jeonse",
    sido: "경기",
    sigungu: "김포시",
    dong: "장기동",
    housingType: "apartment",
    dealType: "jeonse",
    amount: 285_000_000,
    areaSqm: 59.9,
    dealCount: 22,
    recentMonth: "2026-05",
    buildingHint: "김포한강신도시",
  },
  {
    id: "bupyeong-officetel-monthly",
    sido: "인천",
    sigungu: "부평구",
    dong: "부평동",
    housingType: "officetel",
    dealType: "monthly",
    amount: 30_000_000,
    monthlyRent: 700_000,
    areaSqm: 28.6,
    dealCount: 15,
    recentMonth: "2026-05",
    buildingHint: "역세권 오피스텔",
  },
  {
    id: "sillim-detached-monthly",
    sido: "서울",
    sigungu: "관악구",
    dong: "신림동",
    housingType: "detached_multi",
    dealType: "monthly",
    amount: 10_000_000,
    monthlyRent: 650_000,
    areaSqm: 19.8,
    dealCount: 31,
    recentMonth: "2026-05",
    buildingHint: "단독/다가구 소형",
  },
  {
    id: "songdo-officetel-sale",
    sido: "인천",
    sigungu: "연수구",
    dong: "송도동",
    housingType: "officetel",
    dealType: "sale",
    amount: 330_000_000,
    areaSqm: 47.5,
    dealCount: 7,
    recentMonth: "2026-05",
    buildingHint: "송도 오피스텔",
  },
];

const AMOUNT_RANGE_MIN = 0;
const AMOUNT_RANGE_MAX = 3_000_000_000;
const AMOUNT_RANGE_STEP = 50_000_000;

const MONTHLY_RENT_RANGE_MIN = 0;
const MONTHLY_RENT_RANGE_MAX = 10_000_000;
const MONTHLY_RENT_RANGE_STEP = 100_000;
const DEALS_PER_PAGE = 10;
const SEMI_JEONSE_DEPOSIT_THRESHOLD = 100_000_000;

const DEAL_LIST_SORT_LABEL: Record<DealListSort, string> = {
  area: "면적순",
  recent: "최근 거래일",
  deposit: "전세금/보증금",
  monthly: "월세",
};

function formatKrw(value: number): string {
  if (value >= 100_000_000) {
    const eok = Math.floor(value / 100_000_000);
    const rest = Math.round((value % 100_000_000) / 10_000_000);
    return rest > 0 ? `${eok}억${rest}천만` : `${eok}억`;
  }
  return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만`;
}

function budgetFieldLabel(dealType: DealType, side: "min" | "max"): string {
  const suffix = side === "min" ? "최저" : "최고";
  if (dealType === "jeonse") return `전세보증금 ${suffix}`;
  if (dealType === "monthly") return `보증금 ${suffix}`;
  return `매매가 ${suffix}`;
}

function budgetSectionTitle(dealType: DealType): string {
  if (dealType === "jeonse") return "4. 전세보증금";
  if (dealType === "monthly") return "4. 보증금/월세";
  return "4. 매매가";
}

function clampBudgetRange(nextMin: number, nextMax: number): [number, number] {
  const min = Math.max(AMOUNT_RANGE_MIN, Math.min(nextMin, AMOUNT_RANGE_MAX));
  const max = Math.max(AMOUNT_RANGE_MIN, Math.min(nextMax, AMOUNT_RANGE_MAX));
  if (min > max) return [max, min];
  return [min, max];
}

function pyeong(areaSqm: number): string {
  return `${Math.round((areaSqm / 3.3058) * 10) / 10}평`;
}

function formatDealDate(date: string, fallbackMonth: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date.slice(2);
  return fallbackMonth;
}

function formatDealPrice(deal: { amount: number; monthlyRent?: number }): string {
  return deal.monthlyRent ? `${formatKrw(deal.amount)} / 월 ${formatKrw(deal.monthlyRent)}` : formatKrw(deal.amount);
}

function dealKindLabel(deal: { amount: number; monthlyRent?: number }, fallback: DealType): string {
  if (deal.monthlyRent && deal.monthlyRent > 0) {
    return deal.amount >= SEMI_JEONSE_DEPOSIT_THRESHOLD ? "반전세" : "월세";
  }
  return DEAL_LABEL[fallback];
}

function compareDealPrice(a: { amount: number; monthlyRent?: number }, b: { amount: number; monthlyRent?: number }): number {
  return a.amount - b.amount || (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0);
}

function chooseRepresentativeDeal(deals: NonNullable<MoveBudgetCandidate["deals"]>): NonNullable<MoveBudgetCandidate["deals"]>[number] {
  const preferred = deals.filter((deal) => deal.contractType !== "renewal");
  const pool = preferred.length > 0 ? preferred : deals;
  const sorted = [...pool].sort(compareDealPrice);
  const index = sorted.length >= 6 ? Math.floor((sorted.length - 1) * 0.25) : 0;
  return sorted[index] ?? deals[0]!;
}

function hasLargePriceVariance(deals: NonNullable<MoveBudgetCandidate["deals"]>): boolean {
  if (deals.length < 2) return false;
  const prices = deals.map((deal) => deal.amount).filter((amount) => amount > 0).sort((a, b) => a - b);
  const min = prices[0] ?? 0;
  const max = prices[prices.length - 1] ?? 0;
  if (min <= 0 || max <= 0) return false;
  return max / min >= 1.6 && max - min >= 100_000_000;
}

function sortDeals(
  deals: NonNullable<MoveBudgetCandidate["deals"]>,
  sortState: DealListSortState
): NonNullable<MoveBudgetCandidate["deals"]> {
  const direction = sortState.direction === "asc" ? 1 : -1;
  return [...deals].sort((a, b) => {
    let primary = 0;
    if (sortState.key === "area") primary = a.areaSqm - b.areaSqm;
    else if (sortState.key === "recent") primary = a.dealDate.localeCompare(b.dealDate);
    else if (sortState.key === "monthly") primary = (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0);
    else primary = a.amount - b.amount;
    return primary * direction || compareDealPrice(a, b);
  });
}

export default function MoveBudgetExplorer({ initialCandidates = [] }: { initialCandidates?: MoveBudgetCandidate[] }) {
  const candidates = initialCandidates.length > 0 ? initialCandidates : DUMMY_CANDIDATES;
  const hasLiveData = initialCandidates.length > 0;
  const [dealTypes, setDealTypes] = useState<DealType[]>(["jeonse"]);
  const [housingTypes, setHousingTypes] = useState<HousingType[]>(["apartment"]);
  const [regionKeys, setRegionKeys] = useState<string[]>([ALL_REGION_KEY]);
  const [budgetMin, setBudgetMin] = useState(AMOUNT_RANGE_MIN);
  const [budgetMax, setBudgetMax] = useState(AMOUNT_RANGE_MAX);
  const [monthlyMin, setMonthlyMin] = useState(MONTHLY_RENT_RANGE_MIN);
  const [monthlyMax, setMonthlyMax] = useState(MONTHLY_RENT_RANGE_MAX);
  const [lookbackMonths] = useState(3);
  const sortBy = "count" as const;
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [regionCityFilter, setRegionCityFilter] = useState<string>("서울");
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [dealPageByCandidate, setDealPageByCandidate] = useState<Record<string, number>>({});
  const [dealSortByCandidate, setDealSortByCandidate] = useState<Record<string, DealListSortState>>({});
  const [resultSort, setResultSort] = useState<ResultSort>("recommended");
  const [resultSortDirection, setResultSortDirection] = useState<SortDirection>("asc");
  const [hasSearched, setHasSearched] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({
    dealTypes: ["jeonse"],
    housingTypes: ["apartment"],
    regionKeys: [ALL_REGION_KEY],
    budgetMin: AMOUNT_RANGE_MIN,
    budgetMax: AMOUNT_RANGE_MAX,
    monthlyMin: MONTHLY_RENT_RANGE_MIN,
    monthlyMax: MONTHLY_RENT_RANGE_MAX,
    lookbackMonths: 3,
    sortBy: "count",
  });

  const draftFilters: SearchFilters = {
    dealTypes,
    housingTypes,
    regionKeys,
    budgetMin,
    budgetMax,
    monthlyMin,
    monthlyMax,
    lookbackMonths,
    sortBy,
  };
  const hasPendingChanges = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);

  function applySearch() {
    setAppliedFilters(draftFilters);
    setExpandedCandidateId(null);
    setDealPageByCandidate({});
    setDealSortByCandidate({});
    setResultSort("recommended");
    setResultSortDirection("asc");
    setHasSearched(true);
  }

  function toggleDealType(type: DealType) {
    setDealTypes((prev) => {
      if (prev.includes(type)) return prev.length === 1 ? prev : prev.filter((item) => item !== type);
      return [...prev, type];
    });
  }

  function toggleHousingType(type: HousingType) {
    setHousingTypes((prev) => {
      if (prev.includes(type)) return prev.length === 1 ? prev : prev.filter((item) => item !== type);
      return [...prev, type];
    });
  }

  function toggleRegionKey(key: string) {
    if (key === ALL_REGION_KEY) {
      setRegionKeys([ALL_REGION_KEY]);
      return;
    }
    setRegionKeys((prev) => {
      const withoutAll = prev.filter((item) => item !== ALL_REGION_KEY);
      if (withoutAll.includes(key)) {
        const next = withoutAll.filter((item) => item !== key);
        return next.length ? next : [ALL_REGION_KEY];
      }
      return [...withoutAll, key];
    });
  }

  const results = useMemo<MoveBudgetResult[]>(() => {
    if (!hasSearched) return [];
    const filtered = candidates.flatMap((candidate) => {
      if (!appliedFilters.dealTypes.includes(candidate.dealType)) return [];
      if (!appliedFilters.housingTypes.includes(candidate.housingType)) return [];
      const candidateRegionKey = `${candidate.sido}:${candidate.sigungu}`;
      if (!appliedFilters.regionKeys.includes(ALL_REGION_KEY) && !appliedFilters.regionKeys.includes(candidateRegionKey)) {
        return [];
      }
      const dealRows = (candidate.deals ?? []).filter((deal) => {
        if (deal.amount < appliedFilters.budgetMin || deal.amount > appliedFilters.budgetMax) return false;
        if (
          candidate.dealType === "monthly" &&
          ((deal.monthlyRent ?? 0) < appliedFilters.monthlyMin ||
            (deal.monthlyRent ?? 0) > appliedFilters.monthlyMax)
        ) {
          return false;
        }
        return true;
      });
      if (dealRows.length === 0) return [];
      const representativeDeal = chooseRepresentativeDeal(dealRows);
      return [{
        candidate,
        dealRows: [...dealRows].sort(compareDealPrice),
        representativeDeal,
        hasPriceVariance: hasLargePriceVariance(dealRows),
        hasLowSample: dealRows.length <= 2,
      }];
    });
    return [...filtered].sort((a, b) => {
      if (resultSort === "price") {
        const direction = resultSortDirection === "asc" ? 1 : -1;
        return compareDealPrice(a.representativeDeal, b.representativeDeal) * direction || b.dealRows.length - a.dealRows.length;
      }
      if (appliedFilters.sortBy === "lowest") return compareDealPrice(a.representativeDeal, b.representativeDeal);
      if (appliedFilters.sortBy === "area") return b.representativeDeal.areaSqm - a.representativeDeal.areaSqm;
      if (appliedFilters.sortBy === "recent") return b.candidate.recentMonth.localeCompare(a.candidate.recentMonth);
      return b.dealRows.length - a.dealRows.length || compareDealPrice(a.representativeDeal, b.representativeDeal);
    });
  }, [appliedFilters, candidates, hasSearched, resultSort, resultSortDirection]);

  const appliedDealLabel = appliedFilters.dealTypes.map((type) => DEAL_LABEL[type]).join("/");
  const appliedHousingLabel = appliedFilters.housingTypes.map((type) => HOUSING_LABEL[type]).join("/");
  const appliedRegionLabel = appliedFilters.regionKeys.includes(ALL_REGION_KEY)
    ? "전국"
    : `${appliedFilters.regionKeys.length}개 지역`;
  const headline = `${appliedRegionLabel} ${formatKrw(appliedFilters.budgetMin)}~${formatKrw(appliedFilters.budgetMax)} ${appliedHousingLabel} ${appliedDealLabel}`;
  const stickySearchSummary = `${appliedDealLabel} · ${appliedHousingLabel} · ${appliedRegionLabel} · ${formatKrw(appliedFilters.budgetMin)}~${appliedFilters.budgetMax >= AMOUNT_RANGE_MAX ? "30억 이상" : formatKrw(appliedFilters.budgetMax)}`;
  const budgetSummary =
    dealTypes.includes("monthly")
      ? `${budgetMin === 0 ? "보증금 최저 없음" : formatKrw(budgetMin)}~${budgetMax >= AMOUNT_RANGE_MAX ? "30억 이상" : formatKrw(budgetMax)} · 월 ${monthlyMin === 0 ? "0원" : formatKrw(monthlyMin)}~${monthlyMax >= MONTHLY_RENT_RANGE_MAX ? "1000만원 이상" : formatKrw(monthlyMax)}`
      : `${budgetMin === 0 ? "최저 없음" : formatKrw(budgetMin)}~${budgetMax >= AMOUNT_RANGE_MAX ? "30억 이상" : formatKrw(budgetMax)}`;
  const depositSummary = `${budgetMin === 0 ? "최저 없음" : formatKrw(budgetMin)} ~ ${budgetMax >= AMOUNT_RANGE_MAX ? "30억 이상" : formatKrw(budgetMax)}`;
  const monthlySummary = `월 ${monthlyMin === 0 ? "0원" : formatKrw(monthlyMin)} ~ ${monthlyMax >= MONTHLY_RENT_RANGE_MAX ? "1000만원 이상" : formatKrw(monthlyMax)}`;
  const regionSummary = regionKeys.includes(ALL_REGION_KEY)
    ? "전국"
    : regionKeys.length <= 2
      ? regionKeys.join(", ")
      : `${regionKeys[0]} 외 ${regionKeys.length - 1}곳`;

  return (
    <div className="space-y-6">
      {hasSearched ? (
        <div className="fixed left-0 right-0 top-[72px] z-40 px-3 sm:top-[76px]">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 rounded-2xl border border-teal-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
            <p className="min-w-0 truncate text-xs font-bold text-slate-600">
              <span className="text-teal-700">현재 검색</span> · {stickySearchSummary}
            </p>
            <a
              href="#move-search-filters"
              className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white"
            >
              조건 수정
            </a>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50/70 px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">이사검색</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          내 예산으로 우리집 찾기
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">최근 실거래 기준으로 예산에 맞는 동네 후보를 찾아보세요.</p>
      </section>

      <section id="move-search-filters" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <CompactFilter title="1. 거래 유형">
            {(Object.keys(DEAL_LABEL) as DealType[]).map((type) => (
              <ChoiceChip key={type} active={dealTypes.includes(type)} onClick={() => toggleDealType(type)}>
                {DEAL_LABEL[type]}
              </ChoiceChip>
            ))}
          </CompactFilter>

          <CompactFilter title="2. 주택 유형">
            {(Object.keys(HOUSING_LABEL) as HousingType[]).map((type) => (
              <ChoiceChip key={type} active={housingTypes.includes(type)} onClick={() => toggleHousingType(type)}>
                {HOUSING_LABEL[type]}
              </ChoiceChip>
            ))}
          </CompactFilter>

          <CompactFilter title="3. 지역 선택">
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setRegionOpen((open) => !open)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-bold transition",
                  regionOpen ? "border-teal-500 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-800"
                )}
              >
                <span className="min-w-0 truncate">{regionSummary}</span>
                <span className="shrink-0 text-xs text-slate-400">{regionOpen ? "닫기" : "선택"}</span>
              </button>
              {regionOpen ? (
                <div className="absolute left-0 right-0 z-40 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                      type="button"
                      onClick={() => toggleRegionKey(ALL_REGION_KEY)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-2 text-xs font-bold",
                        regionKeys.includes(ALL_REGION_KEY)
                          ? "border-teal-500 bg-teal-50 text-teal-800"
                          : "border-slate-200 text-slate-700"
                      )}
                    >
                      전국
                    </button>
                    {ORDERED_DEMAND_REGIONS.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => setRegionCityFilter(city.label)}
                        className={cn(
                          "shrink-0 rounded-full border px-3 py-2 text-xs font-bold",
                          regionCityFilter === city.label
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 text-slate-700"
                        )}
                      >
                        {city.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-xl bg-slate-50 p-2">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {REGION_OPTIONS.filter((option) => option.cityLabel === regionCityFilter).map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => toggleRegionKey(option.key)}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-left text-xs font-semibold transition",
                            regionKeys.includes(option.key)
                              ? "border-teal-500 bg-white text-teal-800"
                              : "border-transparent bg-white text-slate-700 hover:border-teal-200"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRegionOpen(false)}
                    className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
                  >
                    적용
                  </button>
                </div>
              ) : null}
            </div>
          </CompactFilter>

          <CompactFilter title={budgetSectionTitle(dealTypes.includes("monthly") ? "monthly" : dealTypes[0] ?? "jeonse")}>
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setBudgetOpen((open) => !open)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-bold transition",
                  budgetOpen ? "border-teal-500 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-800"
                )}
              >
                {dealTypes.includes("monthly") ? (
                  <span className="min-w-0 space-y-1">
                    <span className="block truncate">
                      <span className="mr-1 text-xs font-bold text-slate-400">보증금</span>
                      {depositSummary}
                    </span>
                    <span className="block truncate">
                      <span className="mr-1 text-xs font-bold text-slate-400">월세</span>
                      {monthlySummary}
                    </span>
                  </span>
                ) : (
                  <span className="min-w-0 truncate">{budgetSummary}</span>
                )}
                <span className="shrink-0 text-xs text-slate-400">{budgetOpen ? "닫기" : "선택"}</span>
              </button>
              {budgetOpen ? (
                <div className="absolute left-0 right-0 z-30 mt-2 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <BudgetRangeSlider
                    min={budgetMin}
                    max={budgetMax}
                    minLabel={budgetFieldLabel(dealTypes.includes("monthly") ? "monthly" : dealTypes[0] ?? "jeonse", "min")}
                    maxLabel={budgetFieldLabel(dealTypes.includes("monthly") ? "monthly" : dealTypes[0] ?? "jeonse", "max")}
                    onChange={(nextMin, nextMax) => {
                      const [safeMin, safeMax] = clampBudgetRange(nextMin, nextMax);
                      setBudgetMin(safeMin);
                      setBudgetMax(safeMax);
                    }}
                  />
                  {dealTypes.includes("monthly") ? (
                    <MonthlyRentRangeSlider
                      min={monthlyMin}
                      max={monthlyMax}
                      onChange={(nextMin, nextMax) => {
                        const min = Math.max(MONTHLY_RENT_RANGE_MIN, Math.min(nextMin, MONTHLY_RENT_RANGE_MAX));
                        const max = Math.max(MONTHLY_RENT_RANGE_MIN, Math.min(nextMax, MONTHLY_RENT_RANGE_MAX));
                        if (min > max) {
                          setMonthlyMin(max);
                          setMonthlyMax(min);
                        } else {
                          setMonthlyMin(min);
                          setMonthlyMax(max);
                        }
                      }}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setBudgetOpen(false)}
                    className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
                  >
                    적용
                  </button>
                </div>
              ) : null}
            </div>
          </CompactFilter>
        </div>
        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-slate-500">
            {hasPendingChanges
              ? "조건이 변경되었습니다. 검색하기를 누르면 결과가 갱신됩니다."
              : hasSearched
                ? `현재 결과: ${headline}`
                : "조건을 선택한 뒤 검색하기를 누르면 결과가 표시됩니다."}
          </p>
          <button
            type="button"
            onClick={applySearch}
            className={cn(
              "min-h-[46px] rounded-2xl px-5 py-3 text-sm font-black text-white shadow-sm transition",
              hasPendingChanges ? "bg-teal-700 hover:bg-teal-800" : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            검색하기
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-slate-950">내 예산에 맞는 최근 거래 후보</h2>
            <p className="mt-1 text-sm text-slate-500">
              {hasSearched
                ? `${headline} · 최근 ${lookbackMonths}개월 ${hasLiveData ? "아파트 실거래 기준" : "더미 데이터 기준"}`
                : "조건을 선택하고 검색하기를 누르면 후보가 표시됩니다."}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {hasSearched ? `${results.length}개 후보` : "검색 전"}
          </span>
        </div>
        {hasSearched ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setResultSort("recommended");
                setResultSortDirection("asc");
              }}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                resultSort === "recommended"
                  ? "border-teal-500 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
              )}
            >
              추천순
            </button>
            <button
              type="button"
              onClick={() => {
                if (resultSort === "price") {
                  setResultSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
                } else {
                  setResultSort("price");
                  setResultSortDirection("asc");
                }
              }}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                resultSort === "price"
                  ? "border-teal-500 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
              )}
            >
              금액순{resultSort === "price" ? (resultSortDirection === "asc" ? " ↑" : " ↓") : null}
            </button>
          </div>
        ) : null}

        {!hasSearched ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
            <p className="text-lg font-black text-slate-950">검색 조건을 먼저 선택하세요</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              거래유형, 주택유형, 지역, 예산을 고른 뒤 검색하기를 누르면 최근 실거래 후보를 보여줍니다.
            </p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-3">
            {results.map(({ candidate, dealRows, representativeDeal, hasPriceVariance, hasLowSample }) => {
              const isExpanded = expandedCandidateId === candidate.id;
              const currentDealPage = dealPageByCandidate[candidate.id] ?? 1;
              const currentDealSort = dealSortByCandidate[candidate.id] ?? { key: "deposit", direction: "asc" };
              const sortedDealRows = sortDeals(dealRows, currentDealSort);
              const totalDealPages = Math.max(1, Math.ceil(sortedDealRows.length / DEALS_PER_PAGE));
              const visibleDeals = sortedDealRows.slice((currentDealPage - 1) * DEALS_PER_PAGE, currentDealPage * DEALS_PER_PAGE);
              return (
                <article key={candidate.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-500">
                      {candidate.sido} {candidate.sigungu} {candidate.dong}
                    </p>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-3xl font-black tracking-tight text-slate-950">
                          {formatKrw(representativeDeal.amount)}
                          {representativeDeal.monthlyRent
                            ? <span className="text-xl"> / 월 {formatKrw(representativeDeal.monthlyRent)}</span>
                            : null}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          현재 조건에 맞는 {dealKindLabel(representativeDeal, candidate.dealType)} {dealRows.length}건 기준 낮은 가격대
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            {representativeDeal.buildingName} · {HOUSING_LABEL[candidate.housingType]}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            {representativeDeal.contractLabel}
                          </span>
                          {representativeDeal.monthlyRent ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              {dealKindLabel(representativeDeal, candidate.dealType)}
                            </span>
                          ) : null}
                          {hasPriceVariance ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                              가격 편차 큼
                            </span>
                          ) : null}
                          {hasLowSample ? (
                            <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-bold text-yellow-700">
                              거래 적음
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedCandidateId((prev) => (prev === candidate.id ? null : candidate.id));
                        setDealPageByCandidate((prev) => ({ ...prev, [candidate.id]: 1 }));
                      }}
                      className="rounded-xl px-2 py-1 transition hover:bg-slate-50"
                    >
                      <p className="text-[11px] font-bold text-slate-400">거래건수</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{dealRows.length}건</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-teal-700">
                        {isExpanded ? "접기" : "내역 보기"}
                      </p>
                    </button>
                    <SimpleMetric label="전용면적" value={`${representativeDeal.areaSqm}㎡`} sub={pyeong(representativeDeal.areaSqm)} />
                    <SimpleMetric label="최근거래" value={candidate.recentMonth} />
                  </div>

                  {hasPriceVariance ? (
                    <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold leading-relaxed text-red-700">
                      같은 지역·유형 안에서 금액 차이가 큽니다. 갱신계약이나 특수 거래가 포함됐을 수 있으니 거래내역을 확인하세요.
                    </p>
                  ) : null}

                  {isExpanded ? (
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-900">
                          거래 내역 <span className="text-slate-500">({dealRows.length}건)</span>
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {currentDealPage} / {totalDealPages}페이지
                        </p>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        현재 검색 조건에 맞는 거래만 표시합니다. 갱신·특수 거래는 실제 시세와 다를 수 있습니다.
                      </p>
                      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                        {(Object.keys(DEAL_LIST_SORT_LABEL) as DealListSort[]).map((sort) => (
                          <button
                            key={sort}
                            type="button"
                            onClick={() => {
                              setDealSortByCandidate((prev) => {
                                const current = prev[candidate.id] ?? { key: "deposit" as DealListSort, direction: "asc" as SortDirection };
                                const nextDirection: SortDirection =
                                  current.key === sort && current.direction === "asc" ? "desc" : "asc";
                                return { ...prev, [candidate.id]: { key: sort, direction: nextDirection } };
                              });
                              setDealPageByCandidate((prev) => ({ ...prev, [candidate.id]: 1 }));
                            }}
                            className={cn(
                              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                              currentDealSort.key === sort
                                ? "border-teal-500 bg-teal-50 text-teal-800"
                                : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
                            )}
                          >
                            {DEAL_LIST_SORT_LABEL[sort]}
                            {currentDealSort.key === sort ? (currentDealSort.direction === "asc" ? " ↑" : " ↓") : null}
                          </button>
                        ))}
                      </div>
                      {visibleDeals.length > 0 ? (
                        <div className="mt-3 overflow-hidden rounded-xl bg-white">
                          <div className="hidden grid-cols-[88px_minmax(0,1fr)_96px_72px_128px] items-center gap-2 border-b border-slate-100 px-4 py-2 text-[11px] font-black text-slate-400 sm:grid">
                            <span>거래일</span>
                            <span>아파트명</span>
                            <span className="text-right">전용면적</span>
                            <span className="text-center">구분</span>
                            <span className="text-right">금액</span>
                          </div>
                          <div className="space-y-2 bg-slate-50 p-2 sm:space-y-0 sm:divide-y sm:divide-slate-100 sm:bg-white sm:p-0">
                            {visibleDeals.map((deal) => (
                              <div
                                key={deal.id}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs shadow-sm sm:grid sm:grid-cols-[88px_minmax(0,1fr)_96px_72px_128px] sm:items-center sm:gap-2 sm:rounded-none sm:border-0 sm:px-4 sm:py-2.5 sm:shadow-none sm:text-sm"
                              >
                                <div className="grid grid-cols-[1fr_auto] gap-3 sm:hidden">
                                  <div className="min-w-0">
                                    <p className="font-semibold tabular-nums text-slate-500">
                                      {formatDealDate(deal.dealDate, deal.dealMonth)}
                                    </p>
                                    <p className="mt-1 break-keep font-black leading-snug text-slate-900">
                                      {deal.buildingName}
                                    </p>
                                    <p className="mt-1 whitespace-nowrap font-semibold tabular-nums text-slate-500">
                                      {deal.areaSqm ? `${deal.areaSqm}㎡` : "-"}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <p className="whitespace-nowrap text-right font-black tabular-nums text-slate-950">
                                      {formatDealPrice(deal)}
                                    </p>
                                    <span
                                      className={cn(
                                        "rounded-full px-2 py-1 text-[10px] font-bold",
                                        deal.monthlyRent
                                          ? "bg-amber-50 text-amber-700"
                                          : deal.contractType === "renewal"
                                            ? "bg-slate-100 text-slate-600"
                                            : "bg-teal-50 text-teal-700"
                                      )}
                                    >
                                      {deal.monthlyRent ? dealKindLabel(deal, candidate.dealType) : deal.contractLabel}
                                    </span>
                                  </div>
                                </div>

                                <span className="hidden font-semibold tabular-nums text-slate-500 sm:block">
                                  {formatDealDate(deal.dealDate, deal.dealMonth)}
                                </span>
                                <span className="hidden min-w-0 truncate font-bold text-slate-800 sm:block">
                                  {deal.buildingName}
                                </span>
                                <span className="hidden whitespace-nowrap text-right font-semibold tabular-nums text-slate-500 sm:block">
                                  {deal.areaSqm ? `${deal.areaSqm}㎡` : "-"}
                                </span>
                                <span className="hidden text-center sm:block">
                                  <span
                                    className={cn(
                                      "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                                      deal.monthlyRent
                                        ? "bg-amber-50 text-amber-700"
                                        : deal.contractType === "renewal"
                                          ? "bg-slate-100 text-slate-600"
                                          : "bg-teal-50 text-teal-700"
                                    )}
                                  >
                                    {deal.monthlyRent ? dealKindLabel(deal, candidate.dealType) : deal.contractLabel}
                                  </span>
                                </span>
                                <span className="hidden whitespace-nowrap text-right font-black tabular-nums text-slate-950 sm:block">
                                  {formatDealPrice(deal)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-500">
                          상세 거래 내역은 실제 데이터 수집 후 표시됩니다.
                        </p>
                      )}
                      {totalDealPages > 1 ? (
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDealPageByCandidate((prev) => ({
                                ...prev,
                                [candidate.id]: Math.max(1, currentDealPage - 1),
                              }))
                            }
                            disabled={currentDealPage <= 1}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                          >
                            이전
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDealPageByCandidate((prev) => ({
                                ...prev,
                                [candidate.id]: Math.min(totalDealPages, currentDealPage + 1),
                              }))
                            }
                            disabled={currentDealPage >= totalDealPages}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                          >
                            다음
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    현재 매물이 아닌 최근 실거래 기준입니다. 실제 매물은 부동산 서비스에서 다시 확인하세요.
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <NoResults
            onExpandBudget={() => setBudgetMax((value) => value + 50_000_000)}
            onIncludeVilla={() => setHousingTypes((prev) => (prev.includes("villa") ? prev : [...prev, "villa"]))}
            onExpandRegion={() => setRegionKeys([ALL_REGION_KEY])}
            onSearch={applySearch}
          />
        )}
      </section>

    </div>
  );
}

function CompactFilter({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-xs font-black text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ChoiceChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-sm font-semibold transition",
        active
          ? "border-teal-500 bg-teal-50 text-teal-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-teal-200"
      )}
    >
      {children}
    </button>
  );
}

function BudgetRangeSlider({
  min,
  max,
  minLabel,
  maxLabel,
  onChange,
}: {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  onChange: (min: number, max: number) => void;
}) {
  const minPercent = (min / AMOUNT_RANGE_MAX) * 100;
  const maxPercent = (max / AMOUNT_RANGE_MAX) * 100;
  const displayMin = min === 0 ? "최저 없음" : formatKrw(min);
  const displayMax = max >= AMOUNT_RANGE_MAX ? "30억 이상" : formatKrw(max);

  return (
    <div className="space-y-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-400">{minLabel}</p>
          <p className="text-sm font-black text-slate-900">{displayMin}</p>
        </div>
        <span className="text-xs font-bold text-slate-300">~</span>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-slate-400">{maxLabel}</p>
          <p className="text-sm font-black text-slate-900">{displayMax}</p>
        </div>
      </div>

      <div className="relative h-9">
        <div className="absolute left-0 right-0 top-4 h-2 rounded-full bg-slate-100" />
        <div
          className="absolute top-4 h-2 rounded-full bg-teal-500"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          aria-label={minLabel}
          type="range"
          min={AMOUNT_RANGE_MIN}
          max={AMOUNT_RANGE_MAX}
          step={AMOUNT_RANGE_STEP}
          value={min}
          onChange={(e) => onChange(Number(e.target.value), max)}
          className="pointer-events-none absolute inset-x-0 top-1 h-8 w-full appearance-none bg-transparent accent-teal-700 [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:pointer-events-auto"
        />
        <input
          aria-label={maxLabel}
          type="range"
          min={AMOUNT_RANGE_MIN}
          max={AMOUNT_RANGE_MAX}
          step={AMOUNT_RANGE_STEP}
          value={max}
          onChange={(e) => onChange(min, Number(e.target.value))}
          className="pointer-events-none absolute inset-x-0 top-1 h-8 w-full appearance-none bg-transparent accent-teal-700 [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:pointer-events-auto"
        />
      </div>

      <div className="flex justify-between text-[11px] font-semibold text-slate-400">
        <span>5천만원 미만</span>
        <span>1억</span>
        <span>30억</span>
      </div>
    </div>
  );
}

function MonthlyRentRangeSlider({
  min,
  max,
  onChange,
}: {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const minPercent =
    ((min - MONTHLY_RENT_RANGE_MIN) / (MONTHLY_RENT_RANGE_MAX - MONTHLY_RENT_RANGE_MIN)) * 100;
  const maxPercent =
    ((max - MONTHLY_RENT_RANGE_MIN) / (MONTHLY_RENT_RANGE_MAX - MONTHLY_RENT_RANGE_MIN)) * 100;
  const displayMin = min === 0 ? "최저 없음" : `월 ${formatKrw(min)}`;
  const displayMax = max >= MONTHLY_RENT_RANGE_MAX ? "월 1000만원 이상" : `월 ${formatKrw(max)}`;

  return (
    <div className="space-y-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-400">월세 최저</p>
          <p className="text-sm font-black text-slate-900">{displayMin}</p>
        </div>
        <span className="text-xs font-bold text-slate-300">~</span>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-slate-400">월세 최고</p>
          <p className="text-sm font-black text-slate-900">{displayMax}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(MONTHLY_RENT_RANGE_MIN, 1_900_000)}
          className={cn(
            "rounded-xl border px-3 py-2 text-xs font-bold transition",
            min === MONTHLY_RENT_RANGE_MIN && max === 1_900_000
              ? "border-teal-500 bg-teal-50 text-teal-800"
              : "border-slate-200 bg-white text-slate-700 hover:border-teal-200"
          )}
        >
          200만원 미만
        </button>
        <button
          type="button"
          onClick={() => onChange(2_000_000, MONTHLY_RENT_RANGE_MAX)}
          className={cn(
            "rounded-xl border px-3 py-2 text-xs font-bold transition",
            min === 2_000_000 && max === MONTHLY_RENT_RANGE_MAX
              ? "border-teal-500 bg-teal-50 text-teal-800"
              : "border-slate-200 bg-white text-slate-700 hover:border-teal-200"
          )}
        >
          200만원 이상
        </button>
      </div>
      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-3 h-2 rounded-full bg-slate-100" />
        <div
          className="absolute top-3 h-2 rounded-full bg-teal-500"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          aria-label="월세 최저"
          type="range"
          min={MONTHLY_RENT_RANGE_MIN}
          max={MONTHLY_RENT_RANGE_MAX}
          step={MONTHLY_RENT_RANGE_STEP}
          value={min}
          onChange={(e) => onChange(Number(e.target.value), max)}
          className="pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent accent-teal-700 [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:pointer-events-auto"
        />
        <input
          aria-label="월세 최고"
          type="range"
          min={MONTHLY_RENT_RANGE_MIN}
          max={MONTHLY_RENT_RANGE_MAX}
          step={MONTHLY_RENT_RANGE_STEP}
          value={max}
          onChange={(e) => onChange(min, Number(e.target.value))}
          className="pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent accent-teal-700 [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:pointer-events-auto"
        />
      </div>
      <div className="flex justify-between text-[11px] font-semibold text-slate-400">
        <span>월 0원</span>
        <span>월 1000만원</span>
      </div>
    </div>
  );
}

function SimpleMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p> : null}
    </div>
  );
}

function NoResults({
  onExpandBudget,
  onIncludeVilla,
  onExpandRegion,
  onSearch,
}: {
  onExpandBudget: () => void;
  onIncludeVilla: () => void;
  onExpandRegion: () => void;
  onSearch: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
      <p className="text-lg font-black text-slate-950">조건에 맞는 최근 거래가 없습니다</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        예산을 넓히거나, 주택 유형·지역 범위·조회 기간을 완화하면 후보가 나올 수 있습니다.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onExpandBudget} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white">
          예산 +5천만 원
        </button>
        <button type="button" onClick={onIncludeVilla} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
          빌라로 보기
        </button>
        <button type="button" onClick={onExpandRegion} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
          지역 전체로 넓히기
        </button>
        <button type="button" onClick={onSearch} className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800">
          완화 조건으로 검색하기
        </button>
      </div>
    </div>
  );
}
