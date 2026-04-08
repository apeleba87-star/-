"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { REGION_GUGUN, type RegionSido } from "@/lib/listings/regions";
import { buildTenderAwardsSearchParams } from "@/lib/tenders/tender-awards-url";

const MAX_INDUSTRIES = 4;

const REGION_OPTIONS = [
  "전체 지역",
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

const SORT_OPTIONS = [
  { id: "openg", label: "개찰 최신순" },
  { id: "openg-old", label: "개찰 오래된순" },
  { id: "amount-high", label: "낙찰금액 높은순" },
  { id: "amount-low", label: "낙찰금액 낮은순" },
] as const;

type SortId = (typeof SORT_OPTIONS)[number]["id"];

type IndustryRow = { code: string; name: string };

type Props = {
  industries: IndustryRow[];
  initialIndustryCodes: string[];
  initialRegion: string;
  initialGugun: string;
  initialSort: SortId;
};

function buildUrl(params: {
  industry: string[];
  region: string;
  gugun: string;
  sort: SortId;
}): string {
  const regionSido = params.region === "전체 지역" ? null : params.region;
  const q =
    "/tender-awards" +
    buildTenderAwardsSearchParams({
      industryCodes: params.industry,
      regionSido,
      regionGugun: params.gugun.trim() || null,
      sort: params.sort !== "openg" ? params.sort : undefined,
    });
  return q || "/tender-awards";
}

export default function TenderAwardsFilters({
  industries,
  initialIndustryCodes,
  initialRegion,
  initialGugun,
  initialSort,
}: Props) {
  const router = useRouter();
  const [industryCapTip, setIndustryCapTip] = useState(false);

  const selectedIndustryCodes = initialIndustryCodes;
  const selectedRegion = initialRegion;
  const selectedGugun = initialGugun;
  const sortBy = initialSort;

  const gugunOptions: readonly string[] =
    selectedRegion !== "전체 지역"
      ? REGION_GUGUN[selectedRegion as RegionSido] ?? []
      : [];

  const toggleIndustry = (code: string) => {
    if (selectedIndustryCodes.includes(code)) {
      router.push(
        buildUrl({
          industry: selectedIndustryCodes.filter((c) => c !== code),
          region: selectedRegion,
          gugun: selectedGugun,
          sort: sortBy,
        })
      );
      return;
    }
    if (selectedIndustryCodes.length >= MAX_INDUSTRIES) {
      setIndustryCapTip(true);
      window.setTimeout(() => setIndustryCapTip(false), 2500);
      return;
    }
    router.push(
      buildUrl({
        industry: [...selectedIndustryCodes, code],
        region: selectedRegion,
        gugun: selectedGugun,
        sort: sortBy,
      })
    );
  };

  const setRegion = (region: string) => {
    let nextGugun = selectedGugun;
    if (region === "전체 지역") nextGugun = "";
    else if (nextGugun && !(REGION_GUGUN[region as RegionSido] ?? []).includes(nextGugun)) nextGugun = "";
    router.push(
      buildUrl({
        industry: selectedIndustryCodes,
        region,
        gugun: nextGugun,
        sort: sortBy,
      })
    );
  };

  const setGugun = (gugun: string) => {
    router.push(
      buildUrl({
        industry: selectedIndustryCodes,
        region: selectedRegion,
        gugun,
        sort: sortBy,
      })
    );
  };

  const setSort = (sort: SortId) => {
    router.push(
      buildUrl({
        industry: selectedIndustryCodes,
        region: selectedRegion,
        gugun: selectedGugun,
        sort,
      })
    );
  };

  const clearFilters = () => router.push("/tender-awards");

  const industryNames = Object.fromEntries(industries.map((i) => [i.code, i.name]));

  const hasActiveFilters =
    selectedIndustryCodes.length > 0 || selectedRegion !== "전체 지역" || Boolean(selectedGugun.trim());

  return (
    <>
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">업종</h2>
        <p className="mb-3 text-xs text-slate-500">
          입찰 공고와 동일하게 관리자 「업종 관리」에 등록된 항목입니다. 코드 기준으로 필터되며 최대 {MAX_INDUSTRIES}개까지
          선택할 수 있어요.
        </p>
        {industryCapTip && (
          <p className="mb-2 text-xs font-medium text-amber-700">업종은 최대 {MAX_INDUSTRIES}개까지 선택할 수 있어요.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/tender-awards")}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 ${
              selectedIndustryCodes.length === 0
                ? "border-transparent bg-blue-600 text-white shadow-md"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            전체
          </button>
          {industries.map((ind) => (
            <button
              key={ind.code}
              type="button"
              onClick={() => toggleIndustry(ind.code)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                selectedIndustryCodes.includes(ind.code)
                  ? "border-transparent bg-blue-600 text-white shadow-md"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {ind.name}
            </button>
          ))}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <section className="relative flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="awards-region" className="mb-3 block text-sm font-semibold text-slate-700">
            시·도
          </label>
          <div className="relative">
            <select
              id="awards-region"
              value={selectedRegion}
              onChange={(e) => setRegion(e.target.value)}
              className="min-h-[44px] w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-medium text-slate-900 transition-colors hover:bg-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REGION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
          </div>
        </section>

        <section className="relative flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="awards-gugun" className="mb-3 block text-sm font-semibold text-slate-700">
            시·군·구
          </label>
          <div className="relative">
            <select
              id="awards-gugun"
              value={selectedGugun}
              onChange={(e) => setGugun(e.target.value)}
              disabled={selectedRegion === "전체 지역"}
              className="min-h-[44px] w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-medium text-slate-900 transition-colors hover:bg-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">시·도 전체 (구·군 미선택)</option>
              {gugunOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
          </div>
        </section>

        <section className="relative flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="awards-sort" className="mb-3 block text-sm font-semibold text-slate-700">
            정렬 기준
          </label>
          <div className="relative">
            <select
              id="awards-sort"
              value={sortBy}
              onChange={(e) => setSort(e.target.value as SortId)}
              className="min-h-[44px] w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-medium text-slate-900 transition-colors hover:bg-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
          </div>
        </section>
      </div>

      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">필터 적용:</span>
          {selectedIndustryCodes.length > 0 &&
            selectedIndustryCodes.map((code) => (
              <span key={code} className="rounded-lg bg-blue-100 px-3 py-1 font-medium text-blue-700">
                {industryNames[code] ?? code}
              </span>
            ))}
          {selectedRegion !== "전체 지역" && (
            <span className="rounded-lg bg-blue-100 px-3 py-1 font-medium text-blue-700">
              {selectedGugun ? `${selectedRegion} ${selectedGugun}` : selectedRegion}
            </span>
          )}
          <button type="button" onClick={clearFilters} className="ml-2 text-slate-500 underline hover:text-slate-700">
            전체 해제
          </button>
        </div>
      )}
    </>
  );
}
