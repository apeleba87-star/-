"use client";

import { formatMoney } from "@/lib/tender-utils";
import {
  getGradeLabel,
  getGradeDescription,
  percentToGrade,
  wageGapPercent,
} from "@/lib/listings/grade";
import type { GradeLetter } from "@/lib/listings/types";

type Props = {
  currentPay: number;
  averagePay: number | null;
  sampleCount: number;
  payUnitLabel: string;
};

export default function MarketComparisonBox({
  currentPay,
  averagePay,
  sampleCount,
  payUnitLabel,
}: Props) {
  const gapPercent = wageGapPercent(currentPay, averagePay);
  const grade: GradeLetter | null = percentToGrade(gapPercent);
  const dataPoor = sampleCount < 3;
  const lowTrust = sampleCount >= 3 && sampleCount < 5;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-blue-50/40 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">시장 평균 비교</h3>
      {dataPoor ? (
        <p className="mt-2 text-sm text-slate-600">표본 수가 부족해 평균을 산출하지 않습니다. (기준: 3건 이상)</p>
      ) : (
        <>
          {lowTrust && (
            <p className="mt-1 text-xs text-amber-700">표본 수가 적어 신뢰도가 낮을 수 있습니다. (현재 {sampleCount}건)</p>
          )}
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">현재 {payUnitLabel}</dt>
              <dd className="font-semibold text-slate-900">{formatMoney(currentPay)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">평균 {payUnitLabel}</dt>
              <dd className="font-medium text-slate-800">{averagePay != null ? formatMoney(averagePay) : "—"}</dd>
            </div>
            {gapPercent != null && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">평균 대비</dt>
                <dd className={gapPercent >= 0 ? "font-semibold text-emerald-600" : "font-medium text-slate-700"}>
                  {gapPercent >= 0 ? "+" : ""}{gapPercent}%
                </dd>
              </div>
            )}
            {grade && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">등급</dt>
                <dd className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 font-semibold text-slate-800">
                    {grade}
                  </span>
                  <span className="text-slate-600">{getGradeLabel(grade)}</span>
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-sm text-slate-600">{getGradeDescription(grade)}</p>
          <p className="mt-1 text-xs text-slate-500">표본 수: {sampleCount}건</p>
        </>
      )}
    </section>
  );
}
