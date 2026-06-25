"use client";

import { useMemo, useState } from "react";
import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";
import { cn } from "@/lib/utils";

type DealType = "jeonse" | "monthly" | "sale";
type HousingType = "apartment" | "villa" | "officetel" | "oneroom";

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

type DealCandidate = {
  id: string;
  sido: "서울" | "경기" | "인천";
  sigungu: string;
  dong: string;
  housingType: HousingType;
  dealType: DealType;
  amount: number;
  monthlyRent?: number;
  areaSqm: number;
  dealCount: number;
  recentMonth: string;
  buildingHint: string;
};

const HOUSING_LABEL: Record<HousingType, string> = {
  apartment: "아파트",
  villa: "빌라",
  officetel: "오피스텔",
  oneroom: "원룸",
};

const DEAL_LABEL: Record<DealType, string> = {
  jeonse: "전세",
  monthly: "월세",
  sale: "매매",
};

const ALL_REGION_KEY = "all";

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
);

const DUMMY_CANDIDATES: DealCandidate[] = [
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
    id: "sillim-oneroom-monthly",
    sido: "서울",
    sigungu: "관악구",
    dong: "신림동",
    housingType: "oneroom",
    dealType: "monthly",
    amount: 10_000_000,
    monthlyRent: 650_000,
    areaSqm: 19.8,
    dealCount: 31,
    recentMonth: "2026-05",
    buildingHint: "소형 원룸 후보",
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

function externalSearchUrl(candidate: DealCandidate): string {
  const query = `${candidate.sido} ${candidate.sigungu} ${candidate.dong} ${HOUSING_LABEL[candidate.housingType]} ${DEAL_LABEL[candidate.dealType]}`;
  return `https://new.land.naver.com/search?query=${encodeURIComponent(query)}`;
}

export default function MoveBudgetExplorer() {
  const [dealTypes, setDealTypes] = useState<DealType[]>(["jeonse"]);
  const [housingTypes, setHousingTypes] = useState<HousingType[]>(["apartment"]);
  const [regionKeys, setRegionKeys] = useState<string[]>([ALL_REGION_KEY]);
  const [budgetMin, setBudgetMin] = useState(AMOUNT_RANGE_MIN);
  const [budgetMax, setBudgetMax] = useState(AMOUNT_RANGE_MAX);
  const [monthlyMin, setMonthlyMin] = useState(MONTHLY_RENT_RANGE_MIN);
  const [monthlyMax, setMonthlyMax] = useState(MONTHLY_RENT_RANGE_MAX);
  const [lookbackMonths] = useState(6);
  const sortBy = "count" as const;
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [regionCityFilter, setRegionCityFilter] = useState<string>("서울");
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({
    dealTypes: ["jeonse"],
    housingTypes: ["apartment"],
    regionKeys: [ALL_REGION_KEY],
    budgetMin: AMOUNT_RANGE_MIN,
    budgetMax: AMOUNT_RANGE_MAX,
    monthlyMin: MONTHLY_RENT_RANGE_MIN,
    monthlyMax: MONTHLY_RENT_RANGE_MAX,
    lookbackMonths: 6,
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

  const results = useMemo(() => {
    const filtered = DUMMY_CANDIDATES.filter((candidate) => {
      if (!appliedFilters.dealTypes.includes(candidate.dealType)) return false;
      if (!appliedFilters.housingTypes.includes(candidate.housingType)) return false;
      const candidateRegionKey = `${candidate.sido}:${candidate.sigungu}`;
      if (!appliedFilters.regionKeys.includes(ALL_REGION_KEY) && !appliedFilters.regionKeys.includes(candidateRegionKey)) {
        return false;
      }
      if (candidate.amount < appliedFilters.budgetMin || candidate.amount > appliedFilters.budgetMax) return false;
      if (
        candidate.dealType === "monthly" &&
        ((candidate.monthlyRent ?? 0) < appliedFilters.monthlyMin ||
          (candidate.monthlyRent ?? 0) > appliedFilters.monthlyMax)
      ) {
        return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (appliedFilters.sortBy === "lowest") return a.amount - b.amount;
      if (appliedFilters.sortBy === "area") return b.areaSqm - a.areaSqm;
      if (appliedFilters.sortBy === "recent") return b.recentMonth.localeCompare(a.recentMonth);
      return b.dealCount - a.dealCount;
    });
  }, [appliedFilters]);

  const appliedDealLabel = appliedFilters.dealTypes.map((type) => DEAL_LABEL[type]).join("/");
  const appliedHousingLabel = appliedFilters.housingTypes.map((type) => HOUSING_LABEL[type]).join("/");
  const appliedRegionLabel = appliedFilters.regionKeys.includes(ALL_REGION_KEY)
    ? "전국"
    : `${appliedFilters.regionKeys.length}개 지역`;
  const headline = `${appliedRegionLabel} ${formatKrw(appliedFilters.budgetMin)}~${formatKrw(appliedFilters.budgetMax)} ${appliedHousingLabel} ${appliedDealLabel}`;
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
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50/70 px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Move Finder</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          내 예산으로 어디까지 갈 수 있을까?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          RTMS 실거래 데이터를 기준으로 예산에 걸린 지역과 주택 유형을 먼저 좁혀보는 탐색 화면입니다.
          현재는 UI 확인용 더미 데이터이며, 실제 매물은 네이버부동산·직방·다방에서 다시 확인해야 합니다.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
                    {DEMAND_REGION_REGISTRY.map((city) => (
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
              : `현재 결과: ${headline}`}
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
              {headline} · 최근 {lookbackMonths}개월 더미 데이터 기준
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {results.length}개 후보
          </span>
        </div>

        {results.length > 0 ? (
          <div className="grid gap-3">
            {results.map((candidate) => {
              return (
                <article key={candidate.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-500">
                      {candidate.sido} {candidate.sigungu} {candidate.dong}
                    </p>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-3xl font-black tracking-tight text-slate-950">
                          {formatKrw(candidate.amount)}
                          {candidate.dealType === "monthly" && candidate.monthlyRent
                            ? <span className="text-xl"> / 월 {formatKrw(candidate.monthlyRent)}</span>
                            : null}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {HOUSING_LABEL[candidate.housingType]} {DEAL_LABEL[candidate.dealType]} · {candidate.buildingHint}
                        </p>
                      </div>
                      <a
                        href={externalSearchUrl(candidate)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-teal-200 hover:text-teal-700"
                      >
                        매물 확인
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3 text-center">
                    <SimpleMetric label="거래건수" value={`${candidate.dealCount}건`} />
                    <SimpleMetric label="전용면적" value={`${candidate.areaSqm}㎡`} sub={pyeong(candidate.areaSqm)} />
                    <SimpleMetric label="최근거래" value={candidate.recentMonth} />
                  </div>

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
