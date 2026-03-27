"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmApplication } from "@/app/jobs/[id]/actions";
import { APPLICATION_STATUS_LABELS } from "@/lib/jobs/types";
import type { ApplicationStatus } from "@/lib/jobs/types";
import { glassCard } from "@/lib/ui-styles";
import {
  MANAGE_APPLICANTS_FETCH_CAP,
  buildManageApplicantsQuery,
  type ManageApplicantsParsedParams,
} from "@/lib/jobs/manage-applicants-params";

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
  /** 확정된 지원자 연락처(전화만, 이메일 제외) */
  contactPhone?: string | null;
};

const STATUS_FILTER_OPTIONS: { value: ManageApplicantsParsedParams["status"]; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "미확정만" },
  { value: "accepted", label: "확정만" },
  { value: "no_show_reported", label: "노쇼" },
];

const GENDER_LABEL: Record<string, string> = { M: "남", F: "여" };

const PERIOD_OPTIONS: { value: ManageApplicantsParsedParams["period"]; label: string }[] = [
  { value: "upcoming", label: "예정·진행" },
  { value: "past", label: "과거 현장" },
  { value: "all", label: "전체 기간" },
];

const SORT_OPTIONS: { value: ManageApplicantsParsedParams["sort"]; label: string }[] = [
  { value: "applied_desc", label: "지원일 최신순" },
  { value: "work_desc", label: "작업일 최신순" },
  { value: "work_asc", label: "작업일 오래된순" },
];

type Props = {
  applicants: ManageApplicantRow[];
  jobPostsForFilter: { id: string; title: string; work_date: string | null }[];
  query: ManageApplicantsParsedParams;
  totalFiltered: number;
  totalAll: number;
  pendingTotal: number;
  page: number;
  pageSize: number;
  pageCount: number;
  hitFetchCap: boolean;
};

export default function ManageApplicantsView({
  applicants,
  jobPostsForFilter,
  query,
  totalFiltered,
  totalAll,
  pendingTotal,
  page,
  pageSize,
  pageCount,
  hitFetchCap,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localApplicants, setLocalApplicants] = useState<ManageApplicantRow[]>(applicants);
  const [expandedBio, setExpandedBio] = useState<Set<string>>(() => new Set());
  const [searchDraft, setSearchDraft] = useState(query.q);

  useEffect(() => {
    setLocalApplicants(applicants);
  }, [applicants]);

  useEffect(() => {
    setSearchDraft(query.q);
  }, [query.q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchDraft.trim();
      if (next === query.q.trim()) return;
      startTransition(() => {
        router.replace(`/jobs/manage${buildManageApplicantsQuery(query, { q: next })}`);
      });
    }, 420);
    return () => window.clearTimeout(handle);
  }, [searchDraft, query, router]);

  const filtersActive = useMemo(() => {
    return (
      query.status !== "all" ||
      query.postId !== "all" ||
      query.period !== "upcoming" ||
      query.sort !== "applied_desc" ||
      Boolean(query.q) ||
      Boolean(query.workFrom) ||
      Boolean(query.workTo)
    );
  }, [query]);

  function navigatePatch(patch: Partial<ManageApplicantsParsedParams>) {
    startTransition(() => {
      router.replace(`/jobs/manage${buildManageApplicantsQuery(query, patch)}`);
    });
  }

  async function handleConfirm(applicationId: string, jobPostId: string) {
    setLoadingId(applicationId);
    setError(null);
    const result = await confirmApplication(applicationId, jobPostId);
    setLoadingId(null);
    if (!result.ok) {
      setError(result.error ?? "확정 실패");
      return;
    }
    setLocalApplicants((prev) =>
      prev.map((a) =>
        a.applicationId === applicationId
          ? { ...a, status: "accepted" as const, contactPhone: result.contactPhone ?? a.contactPhone }
          : a
      )
    );
    router.refresh();
  }

  const summaryLine =
    filtersActive && totalAll > 0 ? (
      <>
        조건에 맞는 <strong>{totalFiltered}건</strong>
        <span className="text-slate-500"> · 내 구인 전체 지원 {totalAll}건</span>
      </>
    ) : (
      <>
        내 구인 전체 <strong>{totalAll}건</strong> 지원
      </>
    );

  return (
    <div className={`${glassCard} overflow-hidden p-4 sm:p-5`}>
      <div className="mb-1">
        <p className="text-sm text-slate-700">{summaryLine}</p>
        {pendingTotal > 0 && (
          <p className="mt-1 text-sm text-amber-800">
            미확정 <strong>{pendingTotal}건</strong> (전체 구인글 기준)
          </p>
        )}
      </div>
      <p className="mb-4 text-xs text-slate-500">
        한 줄은 <strong>포지션별 지원 1건</strong>입니다. 같은 분이 여러 글·포지션에 지원하면 행이 여러 개일 수 있습니다.
      </p>

      {hitFetchCap && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          작업일 기준 정렬은 최대 {MANAGE_APPLICANTS_FETCH_CAP.toLocaleString("ko-KR")}건만 불러옵니다. 더 보려면
          구인글·기간·검색으로 조건을 좁혀 주세요.
        </p>
      )}

      <div className="mb-4 space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => {
            const active = query.period === opt.value;
            return (
              <Link
                key={opt.value}
                href={`/jobs/manage${buildManageApplicantsQuery(query, { period: opt.value })}`}
                scroll={false}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">검색 (닉네임·연락처)</label>
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="이름·전화번호 일부"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">정렬</label>
            <select
              value={query.sort}
              onChange={(e) =>
                navigatePatch({ sort: e.target.value as ManageApplicantsParsedParams["sort"] })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">상태</label>
            <select
              value={query.status}
              onChange={(e) =>
                navigatePatch({ status: e.target.value as ManageApplicantsParsedParams["status"] })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">구인글</label>
            <select
              value={query.postId}
              onChange={(e) => navigatePatch({ postId: e.target.value as "all" | string })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800"
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
              value={query.workFrom}
              onChange={(e) => navigatePatch({ workFrom: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={query.workTo}
              onChange={(e) => navigatePatch({ workTo: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800"
            />
          </div>
          {filtersActive && (
            <Link
              href="/jobs/manage?view=applicants"
              scroll={false}
              className="rounded-lg px-2 py-2 text-xs font-medium text-blue-600 hover:underline"
            >
              필터 초기화
            </Link>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {localApplicants.length === 0 ? (
        <p className="py-8 text-center text-slate-500">
          {totalAll === 0
            ? "지원자가 없습니다. 구인글을 공유해 보세요."
            : query.period === "upcoming" && !filtersActive
              ? "예정·진행 중인 현장에 맞는 지원이 없습니다. «과거 현장» 또는 «전체 기간»을 눌러 보세요."
              : "조건에 맞는 지원이 없습니다."}
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              {totalFiltered === 0 ? "" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalFiltered)} / ${totalFiltered}건`}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <Link
                  href={
                    page <= 1
                      ? "#"
                      : `/jobs/manage${buildManageApplicantsQuery(query, { page: page - 1 })}`
                  }
                  scroll={false}
                  aria-disabled={page <= 1}
                  className={`rounded-lg px-2 py-1 font-medium ${
                    page <= 1 ? "pointer-events-none text-slate-300" : "text-blue-600 hover:underline"
                  }`}
                >
                  이전
                </Link>
                <span className="px-2 text-slate-500">
                  {page} / {pageCount}
                </span>
                <Link
                  href={
                    page >= pageCount
                      ? "#"
                      : `/jobs/manage${buildManageApplicantsQuery(query, { page: page + 1 })}`
                  }
                  scroll={false}
                  aria-disabled={page >= pageCount}
                  className={`rounded-lg px-2 py-1 font-medium ${
                    page >= pageCount ? "pointer-events-none text-slate-300" : "text-blue-600 hover:underline"
                  }`}
                >
                  다음
                </Link>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50/90 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 font-medium">지원자</th>
                  <th className="px-3 py-2.5 font-medium">현장</th>
                  <th className="px-3 py-2.5 font-medium">포지션</th>
                  <th className="px-3 py-2.5 font-medium">지원일</th>
                  <th className="px-3 py-2.5 font-medium">상태</th>
                  <th className="px-3 py-2.5 font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {localApplicants.map((row) => {
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
                  const appliedAt = new Date(row.createdAt).toLocaleString("ko-KR", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const bioExpanded = expandedBio.has(row.applicationId);
                  const showBioToggle = row.bio && row.bio.length > 72;

                  return (
                    <tr key={row.applicationId} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                          <span className="font-medium text-slate-800">{row.nickname || "—"}</span>
                          <span className="text-xs text-slate-500">
                            {row.ageRangeLabel} · {row.gender ? GENDER_LABEL[row.gender] ?? row.gender : "—"}
                          </span>
                          {row.noShowCountInPeriod >= 2 && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                              최근 노쇼 이력
                            </span>
                          )}
                        </div>
                        {row.bio && (
                          <p
                            className={`mt-1 text-xs leading-snug text-slate-600 ${
                              bioExpanded ? "" : "line-clamp-2"
                            }`}
                            title={row.bio}
                          >
                            {row.bio}
                          </p>
                        )}
                        {showBioToggle && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedBio((prev) => {
                                const next = new Set(prev);
                                if (next.has(row.applicationId)) next.delete(row.applicationId);
                                else next.add(row.applicationId);
                                return next;
                              })
                            }
                            className="mt-0.5 text-[11px] font-medium text-blue-600 hover:underline"
                          >
                            {bioExpanded ? "접기" : "소개 더보기"}
                          </button>
                        )}
                        {row.status === "accepted" && row.contactPhone && (
                          <p className="mt-2 text-xs text-slate-700">
                            <span className="text-slate-500">연락처 </span>
                            <a href={`tel:${row.contactPhone}`} className="font-medium text-blue-600 hover:underline">
                              {row.contactPhone}
                            </a>
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/jobs/${row.jobPostId}`} className="font-medium text-blue-600 hover:underline">
                          {row.jobTitle}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {workDateFormatted} · {regionDisplay}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{row.positionLabel}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{appliedAt}</td>
                      <td className="px-3 py-3">
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
                      <td className="px-3 py-3">
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
        </>
      )}
    </div>
  );
}
