"use client";

import { useState } from "react";
import { TrendingDown } from "lucide-react";
import {
  calcStrategyPriceAtDeltaPercent,
  floorLowerPrice,
  formatMoney,
  formatMoneyMan,
  STRATEGY_DELTA_PERCENTS,
} from "@/lib/tender-utils";

type Props = {
  lowerPrice: number | null;
};

function deltaOptionLabel(d: number): string {
  if (d === 0) return "0% · 낙찰 하한가 그대로";
  if (d > 0) return `+${d}% (하한가보다 ${d}% 높게)`;
  return `${d}% (하한가보다 ${Math.abs(d)}% 낮게)`;
}

export default function TenderBidStrategy({ lowerPrice }: Props) {
  const baseLower = floorLowerPrice(lowerPrice);
  const [deltaPercent, setDeltaPercent] = useState<number>(0);

  if (baseLower == null) {
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

  const result = calcStrategyPriceAtDeltaPercent(baseLower, deltaPercent);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
        <TrendingDown className="h-5 w-5 text-slate-500" aria-hidden />
        입찰 전략 가격
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        낙찰 하한가를 기준으로 <strong className="text-slate-700">-3% ~ +3%</strong> 범위에서 조정률을 고르면 금액이
        계산됩니다. 참고용이며 실제 입찰 규정을 반드시 확인하세요.
      </p>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-3">
        <p className="text-xs font-medium text-slate-500">기준 낙찰 하한가</p>
        <p className="mt-0.5 font-semibold text-slate-900">{formatMoney(baseLower)}</p>
        <p className="text-xs text-slate-500">{formatMoneyMan(baseLower)}</p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">하한가</span>
          <span className="mx-1.5 text-slate-400" aria-hidden>
            [
          </span>
          <span className="font-medium text-slate-800">하한률 선택</span>
          <span className="text-slate-400" aria-hidden>
            ]
          </span>
        </p>
        <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-md">
          <span className="sr-only">하한률 선택 (-3% ~ +3%)</span>
          <select
            id="tender-strategy-delta"
            value={deltaPercent}
            onChange={(e) => setDeltaPercent(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm ring-offset-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            aria-label="하한률 선택, 낙찰 하한가 대비 -3%에서 +3%까지"
          >
            {STRATEGY_DELTA_PERCENTS.map((d) => (
              <option key={d} value={d}>
                {deltaOptionLabel(d)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-2xl border-2 border-blue-200 bg-blue-50/90 px-4 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-900/80">적용 금액</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatMoney(result)}</p>
        <p className="text-sm text-slate-600">{formatMoneyMan(result)}</p>
        <p className="mt-3 text-xs leading-relaxed text-slate-600">
          {deltaPercent === 0 ? (
            <>조정 없음(낙찰 하한가와 동일)</>
          ) : (
            <>
              낙찰 하한가 {formatMoney(baseLower)}에{" "}
              <strong>
                {deltaPercent > 0 ? `+${deltaPercent}%` : `${deltaPercent}%`}
              </strong>{" "}
              반영한 금액입니다.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
