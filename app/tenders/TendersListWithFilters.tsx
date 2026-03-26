"use client";

import { useMemo, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileText, ChevronDown, Bookmark } from "lucide-react";
import TenderBidCard from "@/components/tender/TenderBidCard";
import type { TenderBidCardT } from "@/components/tender/TenderBidCard";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import type { HomeAdSlotWithCampaign } from "@/lib/ads";
import { getBaseAmtFromRaw } from "@/lib/tender-utils";
import { ddayNumber } from "@/lib/tender-utils";
import { REGION_GUGUN, type RegionSido } from "@/lib/listings/regions";
import {
  buildTendersSearchParams,
  focusMatchesUrl,
  type UserTenderFocusRow,
} from "@/lib/tenders/user-focus";
import { saveUserTenderFocus, clearUserTenderFocus } from "./actions";
import { dispatchTenderFocusUpdated } from "@/lib/tenders/tender-focus-events";

const MAX_INDUSTRIES = 4;

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
  /** 시·군·구 (시·도 선택 시에만, 빈 문자열이면 시·도 전체만) */
  initialGugun?: string;
  initialSort?: SortId;
  adSlotMid?: HomeAdSlotWithCampaign | null;
  isLoggedIn?: boolean;
  savedFocus?: UserTenderFocusRow | null;
  totalOpenCount?: number;
  /** 로그인 + 저장된 내 관심 있을 때만 숫자 */
  myFocusOpenCount?: number | null;
};

function buildListUrl(params: {
  industry: string[];
  region: string;
  gugun: string;
  sort: string;
}): string {
  const regionSido = params.region === "전체 지역" ? null : params.region;
  const q =
    "/tenders" +
    buildTendersSearchParams({
      industryCodes: params.industry,
      regionSido,
      regionGugun: params.gugun.trim() || null,
      sort: params.sort !== "posted" ? params.sort : undefined,
    });
  return q || "/tenders";
}

function serializeFilterKey(industry: string[], region: string, gugun: string, sort: string): string {
  return JSON.stringify({
    i: [...industry].sort(),
    r: region,
    g: gugun,
    s: sort,
  });
}

export default function TendersListWithFilters({
  tenders,
  industries,
  initialIndustryCodes = [],
  initialRegion = "전체 지역",
  initialGugun = "",
  initialSort = "posted",
  adSlotMid = null,
  isLoggedIn = false,
  savedFocus = null,
  totalOpenCount = 0,
  myFocusOpenCount = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [industryCapTip, setIndustryCapTip] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);

  const selectedIndustryCodes = initialIndustryCodes;
  const selectedRegion = initialRegion;
  const selectedGugun = initialGugun;
  const sortBy = initialSort;

  /** 정렬 변경만 한 경우에는 내 관심 배너를 띄우지 않음 */
  const filterKeyForBanner = useMemo(
    () => serializeFilterKey(selectedIndustryCodes, selectedRegion, selectedGugun, ""),
    [selectedIndustryCodes, selectedRegion, selectedGugun]
  );
  const prevKeyRef = useRef<string | null>(null);

  const hasActiveFilters =
    selectedIndustryCodes.length > 0 || selectedRegion !== "전체 지역" || Boolean(selectedGugun.trim());

  useEffect(() => {
    if (prevKeyRef.current === null) {
      prevKeyRef.current = filterKeyForBanner;
      return;
    }
    if (prevKeyRef.current === filterKeyForBanner) return;
    prevKeyRef.current = filterKeyForBanner;

    if (!hasActiveFilters) {
      setShowSaveBanner(false);
      return;
    }
    const urlState = {
      industryCodes: selectedIndustryCodes,
      regionSido: selectedRegion === "전체 지역" ? null : selectedRegion,
      regionGugun: selectedGugun.trim() || null,
    };
    if (isLoggedIn && savedFocus && focusMatchesUrl(savedFocus, urlState)) {
      setShowSaveBanner(false);
      return;
    }
    setShowSaveBanner(true);
  }, [filterKeyForBanner, hasActiveFilters, isLoggedIn, savedFocus, selectedIndustryCodes, selectedRegion, selectedGugun]);

  const industryNames = useMemo(() => Object.fromEntries(industries.map((i) => [i.code, i.name])), [industries]);

  const gugunOptions: readonly string[] =
    selectedRegion !== "전체 지역"
      ? REGION_GUGUN[selectedRegion as RegionSido] ?? []
      : [];

  const { openTenders, closedTenders } = useMemo(() => {
    const sortFn = (a: TenderBidCardT, b: TenderBidCardT) => {
      switch (sortBy) {
        case "deadline":
          return ddayNumber(a.bid_clse_dt) - ddayNumber(b.bid_clse_dt);
        case "posted": {
          const dtCmp = (b.bid_ntce_dt ?? "").localeCompare(a.bid_ntce_dt ?? "");
          if (dtCmp !== 0) return dtCmp;
          return (a.bid_ntce_no ?? "").localeCompare(b.bid_ntce_no ?? "");
        }
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

  const clearFilters = () => router.push("/tenders");

  const toggleIndustry = (code: string) => {
    if (selectedIndustryCodes.includes(code)) {
      router.push(
        buildListUrl({
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
      buildListUrl({
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
      buildListUrl({
        industry: selectedIndustryCodes,
        region,
        gugun: nextGugun,
        sort: sortBy,
      })
    );
  };

  const setGugun = (gugun: string) => {
    router.push(
      buildListUrl({
        industry: selectedIndustryCodes,
        region: selectedRegion,
        gugun,
        sort: sortBy,
      })
    );
  };

  const setSort = (sort: SortId) => {
    router.push(
      buildListUrl({
        industry: selectedIndustryCodes,
        region: selectedRegion,
        gugun: selectedGugun,
        sort,
      })
    );
  };

  const loginNextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}` || "/tenders";

  const onSaveFocus = () => {
    setSaveMsg(null);
    startTransition(async () => {
      const res = await saveUserTenderFocus({
        regionSido: selectedRegion === "전체 지역" ? null : selectedRegion,
        regionGugun: selectedGugun.trim() || null,
        industryCodes: selectedIndustryCodes,
      });
      if (res.ok) {
        setShowSaveBanner(false);
        setSaveMsg("내 관심으로 저장했어요.");
        dispatchTenderFocusUpdated();
        router.refresh();
      } else {
        setSaveMsg(res.error ?? "저장에 실패했습니다.");
      }
    });
  };

  const onClearFocus = () => {
    setSaveMsg(null);
    startTransition(async () => {
      const res = await clearUserTenderFocus();
      if (res.ok) {
        setSaveMsg("내 관심을 해제했어요.");
        dispatchTenderFocusUpdated();
        router.refresh();
      } else {
        setSaveMsg(res.error ?? "해제에 실패했습니다.");
      }
    });
  };

  return (
    <>
      {/* 진행 중 공고 수: 전체(무료) · 내 관심(로그인) */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-sm">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-700">
          <span>
            진행 중 공고 · 전체{" "}
            <span className="font-semibold tabular-nums text-slate-900">
              {totalOpenCount.toLocaleString()}
            </span>
            건
          </span>
          {isLoggedIn && myFocusOpenCount !== null && (
            <>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <span>
                내 관심 기준{" "}
                <span className="font-semibold tabular-nums text-teal-700">{myFocusOpenCount.toLocaleString()}</span>
                건
              </span>
            </>
          )}
        </p>
        {!isLoggedIn && (
          <p className="mt-2 text-xs text-slate-500">
            <Link href={`/login?next=${encodeURIComponent("/tenders")}`} className="font-medium text-blue-600 hover:underline">
              로그인
            </Link>
            하면 저장한 「내 관심」조건으로 진행 중 건수를 볼 수 있어요.
          </p>
        )}
        {isLoggedIn && savedFocus && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href={
                "/tenders" +
                buildTendersSearchParams({
                  industryCodes: savedFocus.industry_codes ?? [],
                  regionSido: savedFocus.region_sido,
                  regionGugun: savedFocus.region_gugun,
                })
              }
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              저장된 내 관심으로 목록 열기
            </Link>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={onClearFocus}
              disabled={pending}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
            >
              내 관심 해제
            </button>
          </div>
        )}
        {saveMsg && <p className="mt-2 text-xs text-slate-600">{saveMsg}</p>}
      </section>

      {showSaveBanner && hasActiveFilters && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50/80 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Bookmark className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-slate-900">이 조건, 내 관심으로 저장할까요?</p>
              <p className="mt-0.5 text-xs text-slate-600">
                다음에 입찰 목록을 열 때 바로 같은 필터가 적용됩니다. (업종 최대 {MAX_INDUSTRIES}개)
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {!isLoggedIn ? (
              <Link
                href={`/login?next=${encodeURIComponent(loginNextPath)}`}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                로그인하고 저장
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSaveFocus}
                disabled={pending}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
              >
                내 관심으로 저장
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSaveBanner(false)}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              오늘만 보기
            </button>
          </div>
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">업종</h2>
        <p className="mb-3 text-xs text-slate-500">
          업종명으로 선택 시 코드 기준으로 필터됩니다. 최대 {MAX_INDUSTRIES}개까지 선택할 수 있어요.
        </p>
        {industryCapTip && (
          <p className="mb-2 text-xs font-medium text-amber-700">업종은 최대 {MAX_INDUSTRIES}개까지 선택할 수 있어요.</p>
        )}
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

      <div className="mb-6 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <section className="relative flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="tenders-region" className="mb-3 block text-sm font-semibold text-slate-700">
            시·도
          </label>
          <div className="relative">
            <select
              id="tenders-region"
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
          <label htmlFor="tenders-gugun" className="mb-3 block text-sm font-semibold text-slate-700">
            시·군·구
          </label>
          <div className="relative">
            <select
              id="tenders-gugun"
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
          <label htmlFor="tenders-sort" className="mb-3 block text-sm font-semibold text-slate-700">
            정렬 기준
          </label>
          <div className="relative">
            <select
              id="tenders-sort"
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
          <button
            type="button"
            onClick={clearFilters}
            className="ml-2 text-slate-500 underline hover:text-slate-700"
          >
            전체 해제
          </button>
        </div>
      )}

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
        <span className="ml-1 text-xs text-slate-400">(목록 최대 50건)</span>
      </p>

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
              <h2 className="mb-4 text-lg font-semibold text-slate-800">진행 중인 공고</h2>
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
              예상 낙찰 하한가를 확인하려면 공고를 클릭하세요
            </p>
          )}

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
