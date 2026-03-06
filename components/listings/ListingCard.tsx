"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/tender-utils";
import { getGradeLabel, percentToGrade, wageGapPercent } from "@/lib/listings/grade";
import { PAY_UNIT_LABELS } from "@/lib/listings/wage";
import type { PayUnit } from "@/lib/listings/types";

type Props = {
  id: string;
  title: string;
  status: string;
  region: string;
  categoryMain: string;
  categorySub: string | null;
  payAmount: number;
  payUnit: PayUnit;
  normalizedDailyWage: number | null;
  averageNormalizedDailyWage: number | null;
  sampleCount: number;
  sellerGrade: string | null;
};

export default function ListingCard({
  id,
  title,
  status,
  region,
  categoryMain,
  categorySub,
  payAmount,
  payUnit,
  normalizedDailyWage,
  averageNormalizedDailyWage,
  sampleCount,
  sellerGrade,
}: Props) {
  const displayTitle = status === "closed" ? `마감)) ${title}` : title;
  const gapPercent = wageGapPercent(
    normalizedDailyWage ?? undefined,
    averageNormalizedDailyWage ?? undefined
  );
  const grade = sampleCount >= 3 ? percentToGrade(gapPercent) : null;
  const payUnitLabel = PAY_UNIT_LABELS[payUnit];

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/listings/${id}`} className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="line-clamp-2 font-semibold text-slate-900">{displayTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {region} · {categoryMain}
          {categorySub ? ` / ${categorySub}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-slate-500">현재 {payUnitLabel}</p>
            <p className="font-semibold text-slate-800">{formatMoney(payAmount)}</p>
          </div>
          {sampleCount >= 3 && averageNormalizedDailyWage != null && (
            <div className="text-right">
              <p className="text-xs text-slate-500">평균 대비</p>
              <p className={gapPercent != null && gapPercent >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-slate-700"}>
                {gapPercent != null ? (gapPercent >= 0 ? "+" : "") + gapPercent + "%" : "—"}
              </p>
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
      </Link>
    </article>
  );
}
