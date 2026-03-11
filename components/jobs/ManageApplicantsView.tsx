"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmApplication } from "@/app/jobs/[id]/actions";
import { APPLICATION_STATUS_LABELS } from "@/lib/jobs/types";
import type { ApplicationStatus } from "@/lib/jobs/types";
import { glassCard } from "@/lib/ui-styles";

export type ManageApplicantRow = {
  applicationId: string;
  jobPostId: string;
  jobTitle: string;
  workDate: string | null;
  region: string;
  district: string | null;
  positionId: string;
  positionLabel: string;
  requiredCount: number;
  filledCount: number;
  /** 구인글 전체 마감이면 확정 불가 */
  postStatus: string;
  userId: string;
  nickname: string;
  ageRangeLabel: string;
  gender: string | null;
  bio: string | null;
  status: ApplicationStatus;
  noShowCountInPeriod: number;
  createdAt: string;
};

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "미확정만" },
  { value: "accepted", label: "확정만" },
  { value: "no_show_reported", label: "노쇼" },
];

const GENDER_LABEL: Record<string, string> = { M: "남", F: "여" };

type Props = {
  applicants: ManageApplicantRow[];
  jobPostsForFilter: { id: string; title: string; work_date: string | null }[];
};

export default function ManageApplicantsView({ applicants, jobPostsForFilter }: Props) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterJobPostId, setFilterJobPostId] = useState<string>("all");
  const [filterWorkDateFrom, setFilterWorkDateFrom] = useState<string>("");
  const [filterWorkDateTo, setFilterWorkDateTo] = useState<string>("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...applicants];
    if (filterStatus === "pending") {
      list = list.filter((a) => a.status === "applied" || a.status === "reviewing");
    } else if (filterStatus === "accepted") {
      list = list.filter((a) => a.status === "accepted");
    } else if (filterStatus === "no_show_reported") {
      list = list.filter((a) => a.status === "no_show_reported");
    }
    if (filterJobPostId !== "all") {
      list = list.filter((a) => a.jobPostId === filterJobPostId);
    }
    if (filterWorkDateFrom) {
      list = list.filter((a) => a.workDate != null && a.workDate >= filterWorkDateFrom);
    }
    if (filterWorkDateTo) {
      list = list.filter((a) => a.workDate != null && a.workDate <= filterWorkDateTo);
    }
    return list;
  }, [applicants, filterStatus, filterJobPostId, filterWorkDateFrom, filterWorkDateTo]);

  const pendingCount = applicants.filter((a) => a.status === "applied" || a.status === "reviewing").length;

  async function handleConfirm(applicationId: string, jobPostId: string) {
    setLoadingId(applicationId);
    setError(null);
    const result = await confirmApplication(applicationId, jobPostId);
    setLoadingId(null);
    if (!result.ok) {
      setError(result.error ?? "확정 실패");
      return;
    }
    router.refresh();
  }

  return (
    <div className={`${glassCard} overflow-hidden p-4 sm:p-5`}>
      <p className="mb-4 text-sm text-slate-600">
        총 <strong>{applicants.length}명</strong> 지원
        {pendingCount > 0 && (
          <span className="ml-2 text-amber-700">
            (미확정 <strong>{pendingCount}명</strong>)
          </span>
        )}
      </p>

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600">상태</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600">구인글</label>
          <select
            value={filterJobPostId}
            onChange={(e) => setFilterJobPostId(e.target.value)}
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800"
          >
            <option value="all">전체</option>
            {jobPostsForFilter.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {p.work_date ? ` (${p.work_date})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600">작업일</label>
          <input
            type="date"
            value={filterWorkDateFrom}
            onChange={(e) => setFilterWorkDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800"
          />
          <span className="text-slate-400">~</span>
          <input
            type="date"
            value={filterWorkDateTo}
            onChange={(e) => setFilterWorkDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800"
          />
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-slate-500">
          {applicants.length === 0
            ? "지원자가 없습니다. 구인글을 공유해 보세요."
            : "조건에 맞는 지원자가 없습니다."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="pb-2 pr-2 font-medium">지원자</th>
                <th className="pb-2 pr-2 font-medium">현장</th>
                <th className="pb-2 pr-2 font-medium">포지션</th>
                <th className="pb-2 pr-2 font-medium">상태</th>
                <th className="pb-2 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const canConfirm =
                  (row.status === "applied" || row.status === "reviewing") &&
                  row.filledCount < row.requiredCount &&
                  row.postStatus !== "closed";
                const statusLabel =
                  APPLICATION_STATUS_LABELS[row.status as keyof typeof APPLICATION_STATUS_LABELS] ?? row.status;
                const workDateFormatted = row.workDate
                  ? new Date(row.workDate + "T12:00:00").toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";
                const regionDisplay = [row.region, row.district].filter(Boolean).join(" ").trim() || row.region;

                return (
                  <tr key={row.applicationId} className="border-b border-slate-100">
                    <td className="py-3 pr-2">
                      <div>
                        <span className="font-medium text-slate-800">{row.nickname || "—"}</span>
                        <span className="ml-1.5 text-slate-500">
                          {row.ageRangeLabel} · {row.gender ? GENDER_LABEL[row.gender] ?? row.gender : "—"}
                        </span>
                        {row.noShowCountInPeriod >= 2 && (
                          <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                            최근 30일 노쇼 있음
                          </span>
                        )}
                      </div>
                      {row.bio && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{row.bio}</p>
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      <Link
                        href={`/jobs/${row.jobPostId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {row.jobTitle}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {workDateFormatted} · {regionDisplay}
                      </p>
                    </td>
                    <td className="py-3 pr-2 text-slate-700">{row.positionLabel}</td>
                    <td className="py-3 pr-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.status === "accepted"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.status === "no_show_reported"
                            ? "bg-slate-200 text-slate-600"
                            : row.status === "applied" || row.status === "reviewing"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="py-3">
                      {canConfirm && (
                        <button
                          type="button"
                          disabled={loadingId !== null}
                          onClick={() => handleConfirm(row.applicationId, row.jobPostId)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {loadingId === row.applicationId ? "처리 중…" : "확정하기"}
                        </button>
                      )}
                      {!canConfirm && (row.status === "applied" || row.status === "reviewing") && (
                        <Link
                          href={`/jobs/${row.jobPostId}`}
                          className="inline-block rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          글에서 확인
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
