"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, ArrowRight } from "lucide-react";
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

function chipLabel(d: number): string {
  if (d === 0) return "0%";
  return d > 0 ? `+${d}%` : `${d}%`;
}

function chipTitle(d: number): string {
  if (d === 0) return "낙찰 하한가 그대로";
  if (d > 0) return `하한가보다 ${d}% 높게`;
  return `하한가보다 ${Math.abs(d)}% 낮게`;
}

export default function TenderBidStrategy({ lowerPrice }: Props) {
  const baseLower = floorLowerPrice(lowerPrice);
  const [deltaPercent, setDeltaPercent] = useState<number>(0);

  const result = useMemo(
    () => (baseLower != null ? calcStrategyPriceAtDeltaPercent(baseLower, deltaPercent) : null),
    [baseLower, deltaPercent]
  );

  const diffWon = baseLower != null && result != null ? result - baseLower : 0;

  if (baseLower == null) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <SlidersHorizontal className="h-5 w-5 text-slate-500" aria-hidden />
          입찰 전략 가격
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          기초금액·낙찰하한율이 있어야 전략 가격을 계산할 수 있습니다.
        </p>
      </section>
    );
  }

  const resultBlock = (
    <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-900/80">적용 금액</p>
      <motion.p
        key={result}
        initial={{ opacity: 0.65, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="mt-1 text-2xl font-bold tabular-nums text-slate-900"
      >
        {formatMoney(result)}
      </motion.p>
      <p className="text-sm text-slate-600">{formatMoneyMan(result)}</p>
      {deltaPercent !== 0 ? (
        <p className="mt-2 text-xs font-semibold text-blue-900">
          기준 대비 {diffWon > 0 ? "+" : ""}
          {formatMoney(diffWon)} ({diffWon > 0 ? "+" : ""}
          {deltaPercent}%)
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-600">조정 없음 · 낙찰 하한가와 동일</p>
      )}
    </div>
  );

  const chipsBlock = (
    <div>
      <p className="mb-2 text-xs font-bold text-slate-700">하한가 조정률</p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="낙찰 하한가 대비 조정률 -3%에서 +3%까지"
      >
        {STRATEGY_DELTA_PERCENTS.map((d) => {
          const selected = deltaPercent === d;
          return (
            <button
              key={d}
              type="button"
              title={chipTitle(d)}
              onClick={() => setDeltaPercent(d)}
              className={`min-h-11 min-w-11 touch-manipulation rounded-xl border-2 px-3 py-2 text-sm font-bold tabular-nums transition-all duration-150 ${
                selected
                  ? "scale-[1.02] border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-200"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 active:scale-95"
              }`}
              aria-pressed={selected}
            >
              {chipLabel(d)}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">버튼에 마우스를 올리면 각 비율의 의미를 볼 수 있어요.</p>
    </div>
  );

  const baseBlock = (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">기준</p>
      <p className="mt-1 text-xs font-medium text-slate-500">낙찰 하한가</p>
      <p className="mt-1 font-bold tabular-nums text-slate-900">{formatMoney(baseLower)}</p>
      <p className="text-xs text-slate-500">{formatMoneyMan(baseLower)}</p>
    </div>
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <SlidersHorizontal className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
          입찰 전략 가격
        </h2>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800">
          직접 조정
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        아래 <strong className="text-slate-800">비율 버튼</strong>을 눌러{" "}
        <strong className="text-slate-800">-3% ~ +3%</strong> 범위에서 전략가를 바로 맞춰 보세요. 참고용이며 실제
        입찰 규정은 반드시 확인하세요.
      </p>

      {/* 모바일: 기준 → 조정 → 결과 */}
      <div className="mt-5 flex flex-col gap-4 md:hidden">
        {baseBlock}
        {chipsBlock}
        {resultBlock}
      </div>

      {/* 데스크톱: 기준 | 화살표 | 조정 | 화살표 | 적용 */}
      <div className="mt-5 hidden gap-3 md:flex md:items-stretch">
        <div className="w-52 shrink-0">{baseBlock}</div>
        <div className="flex shrink-0 items-center justify-center px-1" aria-hidden>
          <ArrowRight className="h-6 w-6 text-slate-300" />
        </div>
        <div className="min-w-0 flex-1">{chipsBlock}</div>
        <div className="flex shrink-0 items-center justify-center px-1" aria-hidden>
          <ArrowRight className="h-6 w-6 text-slate-300" />
        </div>
        <div className="w-64 shrink-0">{resultBlock}</div>
      </div>
    </section>
  );
}
