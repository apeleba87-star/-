"use client";

import {
  formatMoney,
  formatMoneyMan,
  getLowerRateFromRaw,
  calcLowerPrice,
  categoryLabel,
} from "@/lib/tender-utils";

type Props = {
  title: string;
  organ: string;
  region: string;
  categoryLabelText: string;
  basePrice: number | null;
  raw: unknown;
};

export default function TenderBidSummary({
  title,
  organ,
  region,
  categoryLabelText,
  basePrice,
  raw,
}: Props) {
  const lowerRate = getLowerRateFromRaw(raw);
  const lowerPrice = calcLowerPrice(basePrice, lowerRate);

  return (
    <section className="mb-6 rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-blue-50/80 p-5 shadow-md ring-1 ring-blue-100/80 sm:p-6">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {organ} · {region} · {categoryLabelText}
      </p>
      <div className="my-4 h-px bg-gradient-to-r from-blue-200 via-indigo-200 to-blue-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs font-medium text-slate-500">기초금액</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-800">
            {basePrice != null ? formatMoneyMan(basePrice) : "—"}
          </p>
          {basePrice != null && (
            <p className="text-xs text-slate-500">{formatMoney(basePrice)}</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs font-medium text-slate-500">낙찰하한율</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-800">
            {lowerRate != null ? `${lowerRate}%` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-blue-700 bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-3 shadow-lg">
          <p className="text-xs font-medium text-blue-100">예상 낙찰 하한가</p>
          <p className="mt-0.5 text-xl font-bold text-white md:text-2xl">
            {lowerPrice != null ? formatMoneyMan(lowerPrice) : "—"}
          </p>
          {lowerPrice != null && (
            <p className="text-xs text-blue-100/90">{formatMoney(lowerPrice)}</p>
          )}
        </div>
      </div>
    </section>
  );
}
