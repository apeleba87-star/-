"use client";

import Link from "next/link";
import { MapPin, Tag, Calendar, ArrowRight, Lock } from "lucide-react";
import AuthRequiredCta from "@/components/AuthRequiredCta";
import { formatMoney } from "@/lib/tender-utils";
import { getGradeLabel, percentToGrade, wageGapPercent } from "@/lib/listings/grade";
import { PAY_UNIT_LABELS } from "@/lib/listings/wage";
import type { PayUnit } from "@/lib/listings/types";
import { useState } from "react";

const LISTING_TYPE_LABELS: Record<string, string> = {
  sale_regular: "정기 매매",
  referral_regular: "정기 소개",
  referral_one_time: "일회 소개",
  subcontract: "도급",
};

function formatShortWon(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString();
}

type Props = {
  id: string;
  title: string;
  status: string;
  region: string;
  listingType?: string;
  categoryMain: string;
  categorySub: string | null;
  payAmount: number;
  payUnit: PayUnit;
  monthlyAmount?: number | null;
  dealAmount?: number | null;
  saleMultiplier?: number | null;
  visitsPerWeek?: number | null;
  normalizedDailyWage: number | null;
  averageNormalizedDailyWage: number | null;
  sampleCount: number;
  sellerGrade: string | null;
  /** 등록일 (카드에 표시) */
  createdAt?: string | null;
  /** 비로그인 시 예상 매매가·매매가 블러 및 상세 링크 로그인 유도 */
  isLoggedIn?: boolean;
};

export default function ListingCard({
  id,
  title,
  status,
  region,
  listingType,
  categoryMain,
  categorySub,
  payAmount,
  payUnit,
  monthlyAmount,
  dealAmount,
  saleMultiplier,
  visitsPerWeek,
  normalizedDailyWage,
  averageNormalizedDailyWage,
  sampleCount,
  sellerGrade,
  createdAt,
  isLoggedIn = true,
}: Props) {
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const isClosed = status === "closed";
  const hideSensitive = !isLoggedIn;
  const typeLabel = listingType ? LISTING_TYPE_LABELS[listingType] ?? listingType : null;
  const gapPercent = wageGapPercent(
    normalizedDailyWage ?? null,
    averageNormalizedDailyWage ?? null
  );
  const grade = sampleCount >= 3 ? percentToGrade(gapPercent) : null;
  const payUnitLabel = PAY_UNIT_LABELS[payUnit as PayUnit];

  const isMonthlyPayUnit = (payUnit as string) === "monthly";
  const isSaleRegularOrSub =
    listingType === "sale_regular" || listingType === "subcontract";
  const useMonthlyDisplay = isMonthlyPayUnit || isSaleRegularOrSub;
  const monthlyVal =
    monthlyAmount ?? (useMonthlyDisplay ? payAmount : null);
  const hasDeal = dealAmount != null && dealAmount > 0;
  const mult = saleMultiplier != null && saleMultiplier > 0 && saleMultiplier <= 100 ? saleMultiplier : null;
  const estimatedDeal = monthlyVal != null && monthlyVal > 0 && mult != null ? Math.round(monthlyVal * mult) : null;

  const categoryLine = [region, categoryMain].filter(Boolean).join(" · ") + (categorySub ? ` / ${categorySub}` : "");
  const registeredAt =
    createdAt
      ? new Date(createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
      : null;

  const detailHref = `/listings/${id}`;
  const cardInner = (
    <>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="line-clamp-2 text-xl font-bold text-slate-900 transition-colors group-hover:text-blue-600">
            {title}
          </h2>
          {isClosed && (
            <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
              마감
            </span>
          )}
        </div>

        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
            <span>{categoryLine}</span>
          </li>
          {typeLabel && (
            <li className="flex items-center gap-2">
              <Tag className="h-4 w-4 shrink-0 text-violet-500" />
              <span>{typeLabel}</span>
            </li>
          )}
          {visitsPerWeek != null && visitsPerWeek >= 1 && visitsPerWeek <= 7 && (
            <li className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>주 {visitsPerWeek}회</span>
            </li>
          )}
          {registeredAt && (
            <li className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span>등록 {registeredAt}</span>
            </li>
          )}
        </ul>

        <div className="mt-4 border-t border-slate-200 pt-4">
          {useMonthlyDisplay && monthlyVal != null && monthlyVal > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-500">월 수금</span>
                <span className="text-2xl font-bold tabular-nums bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  월 {formatShortWon(monthlyVal)}원
                </span>
              </div>
              {(() => {
                const dealEqEstimated =
                  hasDeal &&
                  estimatedDeal != null &&
                  Number(dealAmount) === estimatedDeal;
                if (hideSensitive) {
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">예상 매매가</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 tabular-nums">
                          <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                          <span className="blur-sm select-none">—</span>
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">로그인 후 확인 가능</span>
                    </div>
                  );
                }
                if (dealEqEstimated) {
                  return (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">매매가 · 예상 매매가</span>
                      <span className="font-semibold text-slate-800 tabular-nums">{formatShortWon(Number(dealAmount))}원</span>
                    </div>
                  );
                }
                return (
                  <>
                    {estimatedDeal != null && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">예상 매매가</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{formatShortWon(estimatedDeal)}원</span>
                      </div>
                    )}
                    {hasDeal && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">매매가</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{formatShortWon(dealAmount!)}원</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-500">현재 {payUnitLabel}</span>
                <span className="text-xl font-semibold text-slate-800 tabular-nums">{formatMoney(payAmount)}</span>
              </div>
              {!useMonthlyDisplay && sampleCount >= 3 && averageNormalizedDailyWage != null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">평균 대비</span>
                  <span className={gapPercent != null && gapPercent >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-slate-700"}>
                    {gapPercent != null ? (gapPercent >= 0 ? "+" : "") + gapPercent + "%" : "—"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {grade && (
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-medium text-slate-800">
              {grade} {getGradeLabel(grade)}
            </span>
          )}
          {sellerGrade && sellerGrade !== "N" && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              사장 {sellerGrade}
            </span>
          )}
        </div>
    </>
  );

  async function handleShareCopy() {
    setShareMessage(null);
    try {
      const url = typeof window === "undefined"
        ? `/s/listings/${id}`
        : new URL(`/s/listings/${id}?ref=listing_share&ch=card_copy`, window.location.origin).toString();
      await navigator.clipboard.writeText(`${title}\n${url}`);
      setShareMessage("링크를 복사했습니다.");
      window.setTimeout(() => setShareMessage(null), 2000);
    } catch {
      setShareMessage("복사에 실패했습니다.");
    }
  }

  return (
    <article className="group flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-lg transition-all duration-200 hover:-translate-y-2 hover:border-blue-300 hover:shadow-xl">
      {isLoggedIn ? (
        <Link href={detailHref} className="flex flex-1 flex-col">
          {cardInner}
        </Link>
      ) : (
        <AuthRequiredCta
          isLoggedIn={false}
          href={detailHref}
          message="현장거래 상세는 로그인 후 확인할 수 있습니다."
          className="flex flex-1 flex-col"
        >
          {cardInner}
        </AuthRequiredCta>
      )}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            자세히 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleShareCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            공유하기
          </button>
        </div>
        {shareMessage && <p className="mt-1 text-xs text-slate-600">{shareMessage}</p>}
      </div>
    </article>
  );
}
