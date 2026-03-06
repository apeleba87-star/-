"use client";

import { useMemo, useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import TenderBidCard from "@/components/tender/TenderBidCard";
import type { TenderBidCardT } from "@/components/tender/TenderBidCard";
import { parseRegionSido } from "@/lib/tender-utils";
import { getBaseAmtFromRaw } from "@/lib/tender-utils";
import { ddayNumber } from "@/lib/tender-utils";

const CATEGORY_OPTIONS = [
  { id: "cleaning-disinfection", label: "청소+소독방역" },
  { id: "cleaning", label: "청소만" },
  { id: "disinfection", label: "소독방역만" },
  { id: "all", label: "전체" },
] as const;

const SORT_OPTIONS = [
  { id: "deadline", label: "마감일순" },
  { id: "amount-high", label: "금액 높은순" },
  { id: "amount-low", label: "금액 낮은순" },
  { id: "recent", label: "최신순" },
] as const;

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

type CategoryId = (typeof CATEGORY_OPTIONS)[number]["id"];
type SortId = (typeof SORT_OPTIONS)[number]["id"];

function getTenderRegionSido(t: TenderBidCardT): string | null {
  return parseRegionSido(t.bsns_dstr_nm ?? t.ntce_instt_nm ?? null);
}

function categoryMatch(tender: TenderBidCardT, selected: CategoryId): boolean {
  const cats = tender.categories ?? [];
  const hasCleaning = cats.includes("cleaning");
  const hasDisinfection = cats.includes("disinfection");
  if (selected === "all") return true;
  // 청소+소독방역: 청소 또는 소독방역 관련 공고 모두 (둘 다인 경우만이 아님)
  if (selected === "cleaning-disinfection") return hasCleaning || hasDisinfection;
  if (selected === "cleaning") return hasCleaning;
  if (selected === "disinfection") return hasDisinfection;
  return true;
}

function getBaseAmount(t: TenderBidCardT): number {
  if (t.base_amt != null) return Number(t.base_amt);
  const fromRaw = getBaseAmtFromRaw(t.raw);
  return fromRaw ?? 0;
}

type Props = {
  tenders: TenderBidCardT[];
};

export default function TendersListWithFilters({ tenders }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("cleaning-disinfection");
  const [selectedRegion, setSelectedRegion] = useState<string>("전체 지역");
  const [sortBy, setSortBy] = useState<SortId>("deadline");

  const filteredTenders = useMemo(() => {
    let list = tenders.filter((t) => {
      const categoryMatch_ = categoryMatch(t, selectedCategory);
      const regionMatch =
        selectedRegion === "전체 지역" || getTenderRegionSido(t) === selectedRegion;
      return categoryMatch_ && regionMatch;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "deadline":
          return ddayNumber(a.bid_clse_dt) - ddayNumber(b.bid_clse_dt);
        case "amount-high":
          return getBaseAmount(b) - getBaseAmount(a);
        case "amount-low":
          return getBaseAmount(a) - getBaseAmount(b);
        case "recent":
          return (b.bid_ntce_dt ?? b.id).localeCompare(a.bid_ntce_dt ?? a.id);
        default:
          return 0;
      }
    });

    return list;
  }, [tenders, selectedCategory, selectedRegion, sortBy]);

  const hasActiveFilters = selectedCategory !== "all" || selectedRegion !== "전체 지역";

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedRegion("전체 지역");
  };

  return (
    <>
      {/* 필터: 분야별 */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">분야별 공고</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedCategory(opt.id)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                selectedCategory === opt.id
                  ? "border-transparent bg-blue-600 text-white shadow-md"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* 필터: 지역 & 정렬 */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="tenders-region" className="mb-3 block text-sm font-semibold text-slate-700">
            지역 선택
          </label>
          <div className="relative">
            <select
              id="tenders-region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-medium text-slate-900 transition-colors hover:bg-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="tenders-sort" className="mb-3 block text-sm font-semibold text-slate-700">
            정렬 기준
          </label>
          <div className="relative">
            <select
              id="tenders-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortId)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-medium text-slate-900 transition-colors hover:bg-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* 활성 필터 요약 */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">필터 적용:</span>
          {selectedCategory !== "all" && (
            <span className="rounded-lg bg-blue-100 px-3 py-1 font-medium text-blue-700">
              {CATEGORY_OPTIONS.find((o) => o.id === selectedCategory)?.label}
            </span>
          )}
          {selectedRegion !== "전체 지역" && (
            <span className="rounded-lg bg-blue-100 px-3 py-1 font-medium text-blue-700">
              {selectedRegion}
            </span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-2 text-slate-500 underline hover:text-slate-700"
          >
            전체 해제
          </button>
        </div>
      )}

      {/* 검색 결과 카운트 */}
      <p className="mb-4 text-sm text-slate-600">
        총 <span className="font-semibold text-blue-600">{filteredTenders.length}</span>개의 공고
      </p>

      {/* 카드 리스트 */}
      {filteredTenders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <FileText className="mx-auto mb-3 size-12 text-slate-400" aria-hidden />
          <p className="font-medium text-slate-600">검색 결과가 없습니다</p>
          <p className="mt-1 text-sm text-slate-500">다른 필터 조건을 선택해보세요</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredTenders.map((t) => (
            <li key={t.id}>
              <TenderBidCard tender={t} />
            </li>
          ))}
        </ul>
      )}

      {filteredTenders.length > 0 && (
        <p className="mt-8 text-center text-sm text-slate-500">
          💡 예상 낙찰 하한가를 확인하려면 공고를 클릭하세요
        </p>
      )}
    </>
  );
}
