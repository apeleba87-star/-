"use client";

import { getSellerGradeLabel } from "@/lib/listings/grade";
import { formatMoney } from "@/lib/tender-utils";

type Props = {
  displayName: string | null;
  sellerGrade: string | null;
  averageWageScore?: number | null;
  completionRate?: number | null;
  reviewRating?: number | null;
  reviewCount?: number;
};

export default function SellerCard({
  displayName,
  sellerGrade,
  completionRate,
  reviewRating,
  reviewCount = 0,
}: Props) {
  const gradeLabel = getSellerGradeLabel(sellerGrade);
  const dataPoor = !sellerGrade || sellerGrade === "N";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-800">사장 정보</h2>
      <div className="mt-3">
        <p className="font-medium text-slate-900">{displayName ?? "사장"}</p>
        {!dataPoor ? (
          <p className="mt-1 text-sm text-slate-600">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">{sellerGrade}</span> {gradeLabel}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">평가 데이터 부족</p>
        )}
      </div>
      {(completionRate != null || (reviewRating != null && reviewCount > 0)) && (
        <dl className="mt-4 space-y-1 text-sm">
          {completionRate != null && (
            <div className="flex justify-between">
              <dt className="text-slate-500">완료율</dt>
              <dd className="text-slate-800">{Math.round(completionRate * 100)}%</dd>
            </div>
          )}
          {reviewRating != null && reviewCount > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">후기</dt>
              <dd className="text-slate-800">
                {reviewRating.toFixed(1)} / 5 ({reviewCount}개)
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
