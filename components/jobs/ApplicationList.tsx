"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { confirmApplication, cancelApplicationByCompany } from "@/app/jobs/[id]/actions";
import { APPLICATION_STATUS_LABELS } from "@/lib/jobs/types";
import type { ApplicationStatus } from "@/lib/jobs/types";
import { birthYearToAgeRangeLabel } from "@/lib/jobs/age-range";

export type ApplicantRow = {
  applicationId: string;
  userId: string;
  status: ApplicationStatus;
  nickname: string;
  birthYear: number | null;
  gender: string | null;
  bio: string | null;
  reportCountInPeriod: number;
};

type Props = {
  jobPostId: string;
  positionId: string;
  positionLabel: string;
  requiredCount: number;
  applicants: ApplicantRow[];
};

export default function ApplicationList({
  jobPostId,
  positionId,
  positionLabel,
  requiredCount,
  applicants,
}: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accepted = applicants.filter((a) => a.status === "accepted");
  const canConfirmMore = accepted.length < requiredCount;

  async function handleConfirm(applicationId: string) {
    setLoadingId(applicationId);
    setError(null);
    const result = await confirmApplication(applicationId, jobPostId);
    setLoadingId(null);
    if (!result.ok) {
      setError(result.error ?? "확정 실패");
      return;
    }
    window.location.reload();
  }

  async function handleCancelConfirm(applicationId: string) {
    setLoadingId(applicationId);
    setError(null);
    const result = await cancelApplicationByCompany(applicationId, jobPostId);
    setLoadingId(null);
    if (!result.ok) {
      setError(result.error ?? "취소 실패");
      return;
    }
    window.location.reload();
  }

  if (applicants.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 py-4 text-center text-sm text-slate-500">
        {positionLabel} · 아직 지원자가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-slate-200/80 pt-4">
      <h4 className="text-sm font-semibold text-slate-700">
        지원자 {applicants.length}명
        {requiredCount > 0 && (
          <span className="ml-1.5 font-normal text-slate-500">(모집 {requiredCount}명)</span>
        )}
      </h4>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {applicants.map((a, i) => (
          <motion.li
            key={a.applicationId}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 * i }}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{a.nickname || "닉네임 없음"}</p>
              <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                {a.birthYear != null && (
                  <span>{birthYearToAgeRangeLabel(a.birthYear)}</span>
                )}
                {a.gender && (
                  <span>{a.gender === "M" ? "남" : a.gender === "F" ? "여" : a.gender}</span>
                )}
                {a.reportCountInPeriod >= 2 && (
                  <span className="font-medium text-amber-600">
                    신고 이력 {a.reportCountInPeriod}건 (최근 30일)
                  </span>
                )}
              </dl>
              {a.bio && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{a.bio}</p>
              )}
              <p className="mt-1.5 text-xs font-medium text-slate-400">
                {APPLICATION_STATUS_LABELS[a.status]}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {a.status === "accepted" && (
                <button
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => handleCancelConfirm(a.applicationId)}
                  className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  확정 취소
                </button>
              )}
              {(a.status === "applied" || a.status === "reviewing") && canConfirmMore && (
                <button
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => handleConfirm(a.applicationId)}
                  className="min-h-[40px] rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loadingId === a.applicationId ? "처리 중…" : "확정"}
                </button>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
