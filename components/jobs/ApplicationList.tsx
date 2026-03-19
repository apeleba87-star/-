"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { confirmApplication, cancelApplicationByCompany, reportNoShow, type NoShowSubtype } from "@/app/jobs/[id]/actions";
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
  /** 최근 30일 노쇼 신고 횟수. 2회 이상 시 닉네임 옆 배지 */
  noShowCountInPeriod?: number;
  /** 확정 시 구인자에게만 노출 */
  contactPhone?: string | null;
  contactEmail?: string | null;
};

const NO_SHOW_SUBTYPE_LABELS: Record<NoShowSubtype, string> = {
  no_show_absent: "당일 무단 결근(노쇼)",
  no_show_left: "업무 중간 이탈(노쇼)",
  no_show_other: "기타",
};

type Props = {
  jobPostId: string;
  positionId: string;
  positionLabel: string;
  requiredCount: number;
  applicants: ApplicantRow[];
  /** 현장일이 지나면 false. 확정 취소 버튼 비활성화용 */
  allowCancelConfirm?: boolean;
};

export default function ApplicationList({
  jobPostId,
  positionId,
  positionLabel,
  requiredCount,
  applicants,
  allowCancelConfirm = true,
}: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noShowModal, setNoShowModal] = useState<{ applicationId: string; nickname: string } | null>(null);
  const [noShowSubtype, setNoShowSubtype] = useState<NoShowSubtype>("no_show_absent");
  const [noShowReasonText, setNoShowReasonText] = useState("");

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

  function openNoShowModal(applicationId: string, nickname: string) {
    setNoShowModal({ applicationId, nickname });
    setNoShowSubtype("no_show_absent");
    setNoShowReasonText("");
    setError(null);
  }

  async function submitReportNoShow() {
    if (!noShowModal) return;
    setLoadingId(noShowModal.applicationId);
    setError(null);
    const result = await reportNoShow(
      noShowModal.applicationId,
      jobPostId,
      noShowSubtype,
      noShowSubtype === "no_show_other" ? noShowReasonText : null
    );
    setLoadingId(null);
    if (!result.ok) {
      setError(result.error ?? "노쇼 신고 실패");
      return;
    }
    setNoShowModal(null);
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
              <p className="font-semibold text-slate-900">
                {a.nickname || "닉네임 없음"}
                {(a.noShowCountInPeriod ?? 0) >= 2 && (
                  <span className="ml-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                    최근 30일 노쇼 있음
                  </span>
                )}
              </p>
              <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                {a.birthYear != null && (
                  <span>{birthYearToAgeRangeLabel(a.birthYear)}</span>
                )}
                {a.gender && (
                  <span>{a.gender === "M" ? "남" : a.gender === "F" ? "여" : a.gender}</span>
                )}
                {a.reportCountInPeriod >= 2 && (a.noShowCountInPeriod ?? 0) < 2 && (
                  <span className="font-medium text-amber-600">
                    신고 이력 {a.reportCountInPeriod}건 (최근 30일)
                  </span>
                )}
              </dl>
              {a.bio && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{a.bio}</p>
              )}
              {a.status === "accepted" && a.contactPhone && (
                <dl className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-600">연락처</span>
                  <div className="mt-1.5">
                    <dt className="sr-only">연락처</dt>
                    <dd>
                      <a href={`tel:${a.contactPhone}`} className="text-blue-600 hover:underline">
                        {a.contactPhone}
                      </a>
                    </dd>
                  </div>
                </dl>
              )}
              <p className="mt-1.5 text-xs font-medium text-slate-400">
                {APPLICATION_STATUS_LABELS[a.status]}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {a.status === "accepted" && (
                <>
                  <button
                    type="button"
                    disabled={loadingId !== null || !allowCancelConfirm}
                    onClick={() => handleCancelConfirm(a.applicationId)}
                    title={!allowCancelConfirm ? "현장일이 지나면 확정 취소할 수 없습니다. 노쇼·분쟁은 신고로 처리해 주세요." : undefined}
                    className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    확정 취소
                  </button>
                  <button
                    type="button"
                    disabled={loadingId !== null}
                    onClick={() => openNoShowModal(a.applicationId, a.nickname || "지원자")}
                    title="확정했으나 현장에 나오지 않은 경우 노쇼 신고를 남깁니다."
                    className="min-h-[40px] rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 shadow-sm hover:bg-amber-100 disabled:opacity-50"
                  >
                    노쇼 신고
                  </button>
                </>
              )}
              {a.status === "no_show_reported" && (
                <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                  노쇼 발생
                </span>
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

      {noShowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="no-show-modal-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="no-show-modal-title" className="text-lg font-semibold text-slate-900">
              노쇼 신고 — {noShowModal.nickname}
            </h3>
            <p className="mt-1 text-sm text-slate-500">해당 지원자의 노쇼 유형을 선택해 주세요.</p>
            <div className="mt-4 space-y-2">
              {(["no_show_absent", "no_show_left", "no_show_other"] as const).map((value) => (
                <label key={value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="noShowSubtype"
                    value={value}
                    checked={noShowSubtype === value}
                    onChange={() => setNoShowSubtype(value)}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium text-slate-800">{NO_SHOW_SUBTYPE_LABELS[value]}</span>
                </label>
              ))}
            </div>
            {noShowSubtype === "no_show_other" && (
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-600">상세 사유 (선택)</label>
                <textarea
                  value={noShowReasonText}
                  onChange={(e) => setNoShowReasonText(e.target.value)}
                  placeholder="기타 사유를 입력해 주세요."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setNoShowModal(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitReportNoShow}
                disabled={loadingId !== null}
                className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {loadingId === noShowModal.applicationId ? "처리 중…" : "신고하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
