"use client";

import { TrendingDown } from "lucide-react";
import { formatMoney, formatMoneyMan, calcStrategyPrices } from "@/lib/tender-utils";

type Props = {
  lowerPrice: number | null;
};

export default function TenderBidStrategy({ lowerPrice }: Props) {
  const strategy = calcStrategyPrices(lowerPrice);
  if (!strategy) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <TrendingDown className="h-5 w-5 text-slate-500" aria-hidden />
          입찰 전략 가격
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          기초금액·낙찰하한율이 있어야 전략 가격을 계산할 수 있습니다.
        </p>
      </section>
    );
  }

  const rows = [
    { label: "낙찰 하한가", value: strategy.lower, desc: "기준가", highlight: true },
    { label: "하한가 -1%", value: strategy.pct1, desc: "1% 할인", highlight: false },
    { label: "하한가 -2%", value: strategy.pct2, desc: "2% 할인", highlight: false },
    { label: "하한가 -3%", value: strategy.pct3, desc: "3% 할인", highlight: false },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
        <TrendingDown className="h-5 w-5 text-slate-500" aria-hidden />
        입찰 전략 가격
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        참고용 가격이며, 실제 입찰 시 규정을 반드시 확인하세요.
      </p>
      <dl className="mt-4 space-y-3">
        {rows.map(({ label, value, desc, highlight }) => (
          <div
            key={label}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all duration-200 ${
              highlight
                ? "border-2 border-blue-200 bg-blue-50"
                : "border border-slate-100 bg-slate-50/80"
            }`}
          >
            <div>
              <dt className="text-sm font-medium text-slate-700">{label}</dt>
              <dd className="text-xs text-slate-500">{desc}</dd>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-900">{formatMoney(value)}</p>
              <p className="text-xs text-slate-500">{formatMoneyMan(value)}</p>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
