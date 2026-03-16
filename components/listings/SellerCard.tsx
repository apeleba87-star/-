"use client";

import { motion } from "framer-motion";
import { getSellerGradeLabel } from "@/lib/listings/grade";

const GRADE_GRADIENTS: Record<string, string> = {
  S: "from-purple-500 to-pink-500",
  A: "from-blue-500 to-cyan-500",
  B: "from-green-500 to-emerald-500",
  C: "from-amber-500 to-orange-500",
  D: "from-red-500 to-rose-500",
};

type Props = {
  displayName: string | null;
  sellerGrade: string | null;
  averageWageScore?: number | null;
  completionRate?: number | null;
  reviewRating?: number | null;
  reviewCount?: number;
  completedSalesCount?: number;
  incidentReportCount?: number;
  variant?: "default" | "listingDetail";
};

export default function SellerCard({
  displayName,
  sellerGrade,
  completionRate,
  reviewRating,
  reviewCount = 0,
  completedSalesCount = 0,
  incidentReportCount = 0,
  variant = "default",
}: Props) {
  const gradeLabel = getSellerGradeLabel(sellerGrade);
  const dataPoor = !sellerGrade || sellerGrade === "N";
  const showCaution =
    (sellerGrade === "C" || sellerGrade === "D") || incidentReportCount > 0;
  const isDetail = variant === "listingDetail";
  const gradeGradient = sellerGrade && GRADE_GRADIENTS[sellerGrade];

  return (
    <section
      className={
        isDetail
          ? "rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-6 shadow-xl transition-shadow hover:shadow-2xl"
          : "rounded-xl border border-slate-200 bg-white p-5"
      }
    >
      <h2 className="text-lg font-semibold text-slate-800">사장 정보</h2>
      <div className="mt-3">
        <p className="font-medium text-slate-900">{displayName ?? "사장"}</p>
        {!dataPoor ? (
          <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
            {isDetail && gradeGradient ? (
              <motion.span
                whileHover={{ scale: 1.05 }}
                className={`inline-flex rounded-lg bg-gradient-to-r ${gradeGradient} px-2.5 py-0.5 font-semibold text-white shadow-sm`}
              >
                {sellerGrade}
              </motion.span>
            ) : (
              <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">{sellerGrade}</span>
            )}
            <span>{gradeLabel}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">평가 데이터 부족</p>
        )}
        {showCaution && (
          <p className="mt-1.5 text-sm font-medium text-amber-700">거래 시 주의해 주세요.</p>
        )}
      </div>
      {isDetail ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {completedSalesCount > 0 && (
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm"
            >
              <p className="text-xs text-slate-500">거래 완료</p>
              <p className="text-xl font-bold text-slate-800">{completedSalesCount}건</p>
            </motion.div>
          )}
          {completionRate != null && (
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm"
            >
              <p className="text-xs text-slate-500">완료율</p>
              <p className="text-xl font-bold text-slate-800">{Math.round(completionRate * 100)}%</p>
            </motion.div>
          )}
          {reviewRating != null && reviewCount > 0 && (
            <p className="col-span-2 text-sm text-slate-600">
              후기 {reviewRating.toFixed(1)} / 5 ({reviewCount}개) — 사업자 인증 후 제공 예정
            </p>
          )}
        </div>
      ) : (
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
      )}
    </section>
  );
}
