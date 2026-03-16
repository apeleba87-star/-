"use client";

import { motion } from "framer-motion";
import {
  medianGapPercent,
  getMedianGapLabel,
  FALLBACK_LABELS,
  type ListingBenchmarkFallbackLevel,
} from "@/lib/listings/listing-benchmarks";

function formatWon(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString() + "원";
}

type Props = {
  /** 현재 금액 (월수금 등) */
  currentAmount: number;
  /** 해당 구간 중앙값 */
  medianValue: number | null;
  /** 해당 구간 평균 (참고용) */
  avgValue: number | null;
  sampleCount: number;
  fallbackLevel: ListingBenchmarkFallbackLevel;
  metricLabel?: string;
  variant?: "default" | "listingDetail";
};

/**
 * 현장거래 시세 참고: 중앙값 대비 편차 문구, 등급 단정 없음.
 * 표본 30건 미만이면 "참고용" 표시.
 */
export default function ListingPriceReferenceBox({
  currentAmount,
  medianValue,
  avgValue,
  sampleCount,
  fallbackLevel,
  metricLabel = "월 수금",
  variant = "default",
}: Props) {
  const isDetail = variant === "listingDetail";

  if (fallbackLevel === "none") {
    return (
      <section
        className={
          isDetail
            ? "rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-5 shadow-xl shadow-blue-200/30"
            : "rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5"
        }
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">시세 참고</h3>
        <p className="mt-2 text-sm text-slate-600">{FALLBACK_LABELS.none}</p>
      </section>
    );
  }

  const gapPercent = medianGapPercent(currentAmount, medianValue);
  const gapLabel = getMedianGapLabel(gapPercent);
  const isReferenceOnly = sampleCount < 30;

  const comparisonBg =
    gapLabel === "높은 편"
      ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200"
      : gapLabel === "낮은 편"
        ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-cyan-200"
        : "bg-slate-100 border-slate-200";

  return (
    <section
      className={
        isDetail
          ? "rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-5 shadow-xl shadow-blue-200/30"
          : "rounded-2xl border border-slate-200/80 bg-blue-50/40 p-5"
      }
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">시세 참고</h3>
      <p className="mt-1 text-xs text-slate-500">{FALLBACK_LABELS[fallbackLevel]}</p>
      {isReferenceOnly && (
        <p className="mt-1 text-xs text-amber-700">표본이 적어 참고용으로만 활용해 주세요.</p>
      )}
      <div className="mt-4">
        {isDetail ? (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="rounded-xl border-2 border-white/80 bg-white/90 p-4 shadow-inner"
          >
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              현재 {metricLabel} {formatWon(currentAmount)}
            </p>
          </motion.div>
        ) : (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">현재 {metricLabel}</dt>
              <dd className="font-semibold text-slate-900">{formatWon(currentAmount)}</dd>
            </div>
            {medianValue != null && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">구간 중앙값</dt>
                  <dd className="font-medium text-slate-800">{formatWon(medianValue)}</dd>
                </div>
                {avgValue != null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">구간 평균 (참고)</dt>
                    <dd className="text-slate-700">{formatWon(avgValue)}</dd>
                  </div>
                )}
                {gapPercent != null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">중앙값 대비</dt>
                    <dd className="font-medium text-slate-800">
                      {gapPercent >= 0 ? "+" : ""}{gapPercent}% · {gapLabel}
                    </dd>
                  </div>
                )}
              </>
            )}
          </dl>
        )}
        {isDetail && medianValue != null && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="rounded-lg border border-blue-100 bg-white/80 p-3"
            >
              <p className="text-xs text-slate-500">구간 중앙값</p>
              <p className="font-semibold text-slate-800">{formatWon(medianValue)}</p>
            </motion.div>
            {avgValue != null && (
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="rounded-lg border border-blue-100 bg-white/80 p-3"
              >
                <p className="text-xs text-slate-500">구간 평균</p>
                <p className="font-medium text-slate-700">{formatWon(avgValue)}</p>
              </motion.div>
            )}
            {gapPercent != null && (
              <div className="col-span-2">
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-xl border-2 ${comparisonBg} p-3`}
                >
                  <span className="text-lg font-semibold">
                    중앙값 대비 {gapPercent >= 0 ? "+" : ""}{gapPercent}% · {gapLabel}
                  </span>
                </motion.div>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        표본 {sampleCount}건{isReferenceOnly ? " (참고용)" : ""}
      </p>
    </section>
  );
}
