"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, ChevronDown } from "lucide-react";
import TenderBidCard from "@/components/tender/TenderBidCard";
import type { TenderBidCardT } from "@/components/tender/TenderBidCard";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import type { HomeAdSlotWithCampaign } from "@/lib/ads";
import { parseRegionSido } from "@/lib/tender-utils";
import { getBaseAmtFromRaw } from "@/lib/tender-utils";
import { ddayNumber } from "@/lib/tender-utils";

const SORT_OPTIONS = [
  { id: "posted", label: "최신순" },
  { id: "deadline", label: "마감일순" },
  { id: "amount-high", label: "금액 높은순" },
  { id: "amount-low", label: "금액 낮은순" },
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

type SortId = (typeof SORT_OPTIONS)[number]["id"];

function getTenderRegionSido(t: TenderBidCardT): string | null {
  return parseRegionSido(t.bsns_dstr_nm ?? t.ntce_instt_nm ?? null);
}

function getTenderIndustryCodes(t: TenderBidCardT): string[] {
  return (t.tender_industries ?? []).map((ti) => ti.industry_code);
}

function industryMatch(tender: TenderBidCardT, selectedCodes: string[]): boolean {
  if (selectedCodes.length === 0) return true;
  const tenderCodes = getTenderIndustryCodes(tender);
  if (tenderCodes.length === 0) return false;
  return selectedCodes.some((c) => tenderCodes.includes(c));
}

function getBaseAmount(t: TenderBidCardT): number {
  if (t.base_amt != null) return Number(t.base_amt);
  const fromRaw = getBaseAmtFromRaw(t.raw);
  return fromRaw ?? 0;
}

type IndustryRow = { code: string; name: string };

type Props = {
  tenders: TenderBidCardT[];
  industries: IndustryRow[];
  initialIndustryCodes?: string[];
  initialRegion?: string;
  initialSort?: SortId;
  adSlotMid?: HomeAdSlotWithCampaign | null;
  /** 로그인 시 기초금액·낙찰하한율 표시, 비로그인 시 블러 처리 */
  isLoggedIn?: boolean;
};

function buildTendersUrl(params: { industry: string[]; region: string; sort: string }): string {
  const q = new URLSearchParams();
  if (params.industry.length > 0) q.set("industry", params.industry.join(","));
  if (params.region && params.region !== "전체 지역") q.set("region", params.region);
  if (params.sort && params.sort !== "posted") q.set("sort", params.sort);
  const s = q.toString();
  return s ? `/tenders?${s}` : "/tenders";
}

export default function TendersListWithFilters({
  tenders,
  industries,
  initialIndustryCodes = [],
  initialRegion = "전체 지역",
  initialSort = "posted",
  adSlotMid = null,
  isLoggedIn = false,
}: Props) {
  const router = useRouter();
  const selectedIndustryCodes = initialIndustryCodes;
  const selectedRegion = initialRegion;
  const sortBy = initialSort;

  const industryNames = useMemo(() => Object.fromEntries(industries.map((i) => [i.code, i.name])), [industries]);

  const { openTenders, closedTenders } = useMemo(() => {
    const sortFn = (a: TenderBidCardT, b: TenderBidCardT) => {
      switch (sortBy) {
        case "deadline":
          return ddayNumber(a.bid_clse_dt) - ddayNumber(b.bid_clse_dt);
        case "posted":
          const dtCmp = (b.bid_ntce_dt ?? "").localeCompare(a.bid_ntce_dt ?? "");
          if (dtCmp !== 0) return dtCmp;
          return (a.bid_ntce_no ?? "").localeCompare(b.bid_ntce_no ?? "");
        case "amount-high":
          return getBaseAmount(b) - getBaseAmount(a);
        case "amount-low":
          return getBaseAmount(a) - getBaseAmount(b);
        default:
          return 0;
      }
    };
    const open = tenders.filter((t) => ddayNumber(t.bid_clse_dt) >= 0).sort(sortFn);
    const closed = tenders.filter((t) => ddayNumber(t.bid_clse_dt) < 0).sort(sortFn);
    return { openTenders: open, closedTenders: closed };
  }, [tenders, sortBy]);

  const hasActiveFilters = selectedIndustryCodes.length > 0 || selectedRegion !== "전체 지역";

  const clearFilters = () => router.push("/tenders");

  const toggleIndustry = (code: string) => {
    const next = selectedIndustryCodes.includes(code)
      ? selectedIndustryCodes.filter((c) => c !== code)
      : [...selectedIndustryCodes, code];
    router.push(buildTendersUrl({ industry: next, region: selectedRegion, sort: sortBy }));
  };

  const setRegion = (region: string) => {
    router.push(buildTendersUrl({ industry: selectedIndustryCodes, region, sort: sortBy }));
  };

  const setSort = (sort: SortId) => {
    router.push(buildTendersUrl({ industry: selectedIndustryCodes, region: selectedRegion, sort }));
  };

  return (
    <>
      {/* 필터: 업종 (다중 선택). 화면은 업종명, 필터 로직은 업종 코드 기준 */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">업종</h2>
        <p className="mb-3 text-xs text-slate-500">업종명으로 선택 시, 수집된 공고는 업종 코드 기준으로 필터됩니다.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/tenders")}
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
              onChange={(e) => setRegion(e.target.value)}
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
              onChange={(e) => setSort(e.target.value as SortId)}
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
          {selectedIndustryCodes.length > 0 &&
            selectedIndustryCodes.map((code) => (
              <span key={code} className="rounded-lg bg-blue-100 px-3 py-1 font-medium text-blue-700">
                {industryNames[code] ?? code}
              </span>
            ))}
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

      {/* 검색 결과 카운트: 진행 중 / 마감 구분 */}
      <p className="mb-4 text-sm text-slate-600">
        진행 중{" "}
        <span className="font-semibold text-blue-600">{openTenders.length}</span>개
        {closedTenders.length > 0 && (
          <>
            {" "}
            · 마감{" "}
            <span className="font-semibold text-slate-500">{closedTenders.length}</span>개
          </>
        )}
      </p>

      {/* 진행 중인 공고 */}
      {openTenders.length === 0 && closedTenders.length === 0 ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <FileText className="mx-auto mb-3 size-12 text-slate-400" aria-hidden />
            <p className="font-medium text-slate-600">검색 결과가 없습니다</p>
            <p className="mt-1 text-sm text-slate-500">
              현재 필터 조건에서는 등록된 공고가 없습니다. 다음 버튼으로 빠르게 범위를 넓혀보세요.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                전체 보기
              </button>
              <Link
                href="/tenders?sort=deadline"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
              >
                마감일순으로 보기
              </Link>
            </div>
          </div>
          {/* 뉴스레터 CTA: 빈 결과일 때도 노출 */}
          <section className="mt-10 rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-800 sm:text-lg">
              매주 청소 입찰 시장 요약을 받아보세요
            </p>
            <p className="mt-1 text-sm text-slate-600">
              입찰 리포트와 업계 소식을 한곳에서 확인할 수 있습니다.
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/news"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
              >
                리포트·업계 소식 보기
              </Link>
              <Link
                href="/archive"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                뉴스레터 아카이브
              </Link>
            </div>
          </section>
        </>
      ) : (
        <>
          {openTenders.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                진행 중인 공고
              </h2>
              <ul className="space-y-4">
                {openTenders.map((t) => (
                  <li key={t.id}>
                    <TenderBidCard tender={t} industryNames={industryNames} isLoggedIn={isLoggedIn} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {adSlotMid && (
            <div className="mb-10">
              <AdSlotRenderer slot={adSlotMid} variant="card" />
            </div>
          )}

          {/* 마감된 공고 (참고용) */}
          {closedTenders.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-600">
                마감된 공고 <span className="text-sm font-normal text-slate-500">(참고용)</span>
              </h2>
              <ul className="space-y-4">
                {closedTenders.map((t) => (
                  <li key={t.id}>
                    <TenderBidCard tender={t} industryNames={industryNames} isLoggedIn={isLoggedIn} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(openTenders.length > 0 || closedTenders.length > 0) && (
            <p className="mt-8 text-center text-sm text-slate-500">
              💡 예상 낙찰 하한가를 확인하려면 공고를 클릭하세요
            </p>
          )}

          {/* 뉴스레터 CTA: 리스트 하단 */}
          <section className="mt-10 rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-800 sm:text-lg">
              매주 청소 입찰 시장 요약을 받아보세요
            </p>
            <p className="mt-1 text-sm text-slate-600">
              입찰 리포트와 업계 소식을 한곳에서 확인할 수 있습니다.
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/news"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
              >
                리포트·업계 소식 보기
              </Link>
              <Link
                href="/archive"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                뉴스레터 아카이브
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
