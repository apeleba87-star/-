"use client";

import { getSellerGradeLabel } from "@/lib/listings/grade";

type Props = {
  displayName: string | null;
  sellerGrade: string | null;
  averageWageScore?: number | null;
  completionRate?: number | null;
  reviewRating?: number | null;
  reviewCount?: number;
  completedSalesCount?: number;
  incidentReportCount?: number;
};

export default function SellerCard({
  displayName,
  sellerGrade,
  completionRate,
  reviewRating,
  reviewCount = 0,
  completedSalesCount = 0,
  incidentReportCount = 0,
}: Props) {
  const gradeLabel = getSellerGradeLabel(sellerGrade);
  const dataPoor = !sellerGrade || sellerGrade === "N";
  const showCaution =
    (sellerGrade === "C" || sellerGrade === "D") || incidentReportCount > 0;

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
        {showCaution && (
          <p className="mt-1.5 text-sm font-medium text-amber-700">거래 시 주의해 주세요.</p>
        )}
      </div>
      <dl className="mt-4 space-y-1 text-sm">
        {completedSalesCount > 0 && (
          <div className="flex justify-between">
            <dt className="text-slate-500">거래 완료</dt>
            <dd className="text-slate-800">{completedSalesCount}건</dd>
          </div>
        )}
        {completionRate != null && (
          <div className="flex justify-between">
            <dt className="text-slate-500">완료율</dt>
            <dd className="text-slate-800">{Math.round(completionRate * 100)}%</dd>
          </div>
        )}
        {reviewRating != null && reviewCount > 0 && (
          <div className="flex justify-between items-center gap-2">
            <dt className="text-slate-500">후기</dt>
            <dd className="text-slate-800 flex items-center gap-2">
              {reviewRating.toFixed(1)} / 5 ({reviewCount}개)
              <a href="#seller-reviews" className="text-blue-600 text-xs hover:underline">
                후기 보기
              </a>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
