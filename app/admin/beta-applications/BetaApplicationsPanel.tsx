"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BETA_REVIEW_STATUS_LABELS,
  BETA_REVIEW_STATUSES,
  BETA_REVIEW_TAG_PRESETS,
  type BetaReviewStatus,
} from "@/lib/beta-admin-review";
import { updateBetaApplicationReview } from "./actions";

export type BetaApplicationAdminRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  applicant_name: string;
  contact: string;
  phone: string;
  industry: string;
  employee_band: string;
  record_management: string;
  pain_experiences: string[];
  dispute_last_year: string;
  desired_features: string[];
  biggest_pain: string;
  availability: string;
  pain_score: number;
  review_status: string;
  review_tags: string[] | null;
  admin_note: string | null;
};

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function RowEditor({ row }: { row: BetaApplicationAdminRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const initialStatus = (BETA_REVIEW_STATUSES as readonly string[]).includes(row.review_status)
    ? (row.review_status as BetaReviewStatus)
    : "new";
  const [reviewStatus, setReviewStatus] = useState<BetaReviewStatus>(initialStatus);
  const [tagsRaw, setTagsRaw] = useState((row.review_tags ?? []).join(", "));
  const [adminNote, setAdminNote] = useState(row.admin_note ?? "");

  const save = () => {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const res = await updateBetaApplicationReview({
        id: row.id,
        reviewStatus,
        reviewTagsRaw: tagsRaw,
        adminNote,
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setMsg("저장했습니다.");
      router.refresh();
    });
  };

  const appendPreset = (tag: string) => {
    setTagsRaw((prev) => {
      const parts = prev
        .split(/[,，\n]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (parts.includes(tag)) return prev;
      return [...parts, tag].join(", ");
    });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <span className="text-xs font-medium text-slate-500">연락처</span>
          <p className="mt-0.5 break-all text-slate-800">{row.contact}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">휴대폰</span>
          <p className="mt-0.5 font-mono text-slate-800">{row.phone}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">업종</span>
          <p className="mt-0.5 text-slate-800">{row.industry}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">직원 규모</span>
          <p className="mt-0.5 text-slate-800">{row.employee_band}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">기록 관리</span>
          <p className="mt-0.5 text-slate-800">{row.record_management}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">최근 1년 미수·분쟁</span>
          <p className="mt-0.5 text-slate-800">{row.dispute_last_year}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">선정 시 일정</span>
          <p className="mt-0.5 text-slate-800">{row.availability}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-500">갱신</span>
          <p className="mt-0.5 text-slate-800">{formatDt(row.updated_at)}</p>
        </div>
      </div>
      <div>
        <span className="text-xs font-medium text-slate-500">경험 체크</span>
        <ul className="mt-1 list-inside list-disc text-slate-700">
          {(row.pain_experiences ?? []).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <div>
        <span className="text-xs font-medium text-slate-500">필요 기능</span>
        <ul className="mt-1 list-inside list-disc text-slate-700">
          {(row.desired_features ?? []).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <div>
        <span className="text-xs font-medium text-slate-500">불편한 점</span>
        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{row.biggest_pain || "—"}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <label className="block text-xs font-semibold text-slate-600">검수 상태</label>
        <select
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value as BetaReviewStatus)}
          className="mt-1 w-full max-w-xs rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          {BETA_REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BETA_REVIEW_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-semibold text-slate-600">태그 (쉼표로 구분)</label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {BETA_REVIEW_TAG_PRESETS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => appendPreset(t)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
            >
              +{t}
            </button>
          ))}
        </div>
        <textarea
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          placeholder="예: ICP-A, 우선연락"
        />

        <label className="mt-3 block text-xs font-semibold text-slate-600">관리자 메모</label>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          placeholder="통화 요약, 후속 액션 등"
        />

        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
        {msg ? <p className="mt-2 text-sm text-emerald-700">{msg}</p> : null}

        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

const filterActive = "rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white";
const filterIdle = "rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200";

export default function BetaApplicationsPanel({
  rows,
  statusFilter,
}: {
  rows: BetaApplicationAdminRow[];
  statusFilter: string | null;
}) {
  const exportHref = "/api/admin/beta-applications/export";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/admin/beta-applications" className={!statusFilter ? filterActive : filterIdle}>
          전체
        </Link>
        {BETA_REVIEW_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/beta-applications?status=${s}`}
            className={statusFilter === s ? filterActive : filterIdle}
          >
            {BETA_REVIEW_STATUS_LABELS[s]}
          </Link>
        ))}
        <a
          href={exportHref}
          className="ml-auto inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          CSV 내려받기
        </a>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        <code>pain_score</code> 내림차순 정렬. 상태·태그·메모는 저장 후 목록이 갱신됩니다.
      </p>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">표시할 지원이 없습니다.</p>
        ) : (
          rows.map((row) => (
            <details
              key={row.id}
              className="group rounded-lg border border-slate-200 bg-white open:border-slate-300 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2.5 text-sm marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-xs text-slate-400">{formatDt(row.created_at)}</span>
                <span className="font-semibold text-slate-900">{row.applicant_name}</span>
                <span className="text-slate-600">{row.industry}</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">점수 {row.pain_score}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                  {(BETA_REVIEW_STATUSES as readonly string[]).includes(row.review_status)
                    ? BETA_REVIEW_STATUS_LABELS[row.review_status as BetaReviewStatus]
                    : row.review_status}
                </span>
                {(row.review_tags?.length ?? 0) > 0 ? (
                  <span className="text-xs text-teal-700">태그 {(row.review_tags ?? []).join(" · ")}</span>
                ) : null}
                <span className="ml-auto text-xs text-slate-400 group-open:hidden">펼치기</span>
                <span className="ml-auto hidden text-xs text-slate-400 group-open:inline">접기</span>
              </summary>
              <div className="border-t border-slate-100 px-3 pb-3">
                <RowEditor key={`${row.id}-${row.updated_at ?? ""}`} row={row} />
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
