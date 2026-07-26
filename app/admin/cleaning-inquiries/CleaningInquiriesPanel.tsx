"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  updateCleaningInquiryStatus,
  type CleaningInquiryStatus,
} from "@/app/admin/cleaning-inquiries/actions";

export type CleaningInquiryRow = {
  id: string;
  created_at: string;
  inquiry_type: "regular" | "move_in";
  service_slug: string | null;
  region: string | null;
  phone: string;
  message: string | null;
  ref_slug: string | null;
  ref_path: string | null;
  status: CleaningInquiryStatus;
};

export const CLEANING_INQUIRY_STATUS_LABELS: Record<CleaningInquiryStatus, string> = {
  pending: "대기",
  contacted: "연락함",
  closed: "종료",
};

export const CLEANING_INQUIRY_TYPE_LABELS: Record<"regular" | "move_in", string> = {
  regular: "정기청소",
  move_in: "입주청소",
};

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function statusClass(status: CleaningInquiryStatus): string {
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "contacted") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-700";
}

type Props = {
  rows: CleaningInquiryRow[];
  typeFilter: "regular" | "move_in" | null;
  statusFilter: CleaningInquiryStatus | null;
};

export default function CleaningInquiriesPanel({ rows, typeFilter, statusFilter }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(rows[0]?.id ?? null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      pending: rows.filter((r) => r.status === "pending").length,
      regular: rows.filter((r) => r.inquiry_type === "regular").length,
      move_in: rows.filter((r) => r.inquiry_type === "move_in").length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter && r.inquiry_type !== typeFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });
  }, [rows, typeFilter, statusFilter]);

  async function saveStatus(id: string, status: CleaningInquiryStatus) {
    setSavingId(id);
    const res = await updateCleaningInquiryStatus(id, status);
    setSavingId(null);
    if (res.ok) router.refresh();
    else alert(res.error ?? "저장 실패");
  }

  function hrefWith(params: { type?: string | null; status?: string | null }) {
    const q = new URLSearchParams();
    const type = params.type === undefined ? typeFilter : params.type;
    const status = params.status === undefined ? statusFilter : params.status;
    if (type) q.set("type", type);
    if (status) q.set("status", status);
    const s = q.toString();
    return s ? `/admin/cleaning-inquiries?${s}` : "/admin/cleaning-inquiries";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={hrefWith({ type: null })}
          className={`rounded-full px-3 py-1.5 font-medium ${
            !typeFilter ? "bg-teal-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          전체 유형
        </Link>
        <Link
          href={hrefWith({ type: "regular" })}
          className={`rounded-full px-3 py-1.5 font-medium ${
            typeFilter === "regular" ? "bg-teal-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          정기 {counts.regular}
        </Link>
        <Link
          href={hrefWith({ type: "move_in" })}
          className={`rounded-full px-3 py-1.5 font-medium ${
            typeFilter === "move_in" ? "bg-teal-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          입주 {counts.move_in}
        </Link>
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:inline-block" aria-hidden />
        <Link
          href={hrefWith({ status: null })}
          className={`rounded-full px-3 py-1.5 font-medium ${
            !statusFilter ? "bg-slate-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          전체 상태
        </Link>
        {(["pending", "contacted", "closed"] as CleaningInquiryStatus[]).map((st) => (
          <Link
            key={st}
            href={hrefWith({ status: st })}
            className={`rounded-full px-3 py-1.5 font-medium ${
              statusFilter === st ? "bg-slate-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {CLEANING_INQUIRY_STATUS_LABELS[st]}
            {st === "pending" ? ` ${counts.pending}` : ""}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          조건에 맞는 문의가 없습니다. 공개 폼:{" "}
          <a href="/inquiry/regular" className="font-medium text-teal-700 hover:underline" target="_blank" rel="noreferrer">
            정기
          </a>
          {" · "}
          <a href="/inquiry/move-in" className="font-medium text-teal-700 hover:underline" target="_blank" rel="noreferrer">
            입주
          </a>
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {visible.map((row) => {
            const open = expandedId === row.id;
            const busy = savingId === row.id;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : row.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {CLEANING_INQUIRY_TYPE_LABELS[row.inquiry_type]}
                      <span className="ml-2 text-sm font-normal text-slate-600">
                        {row.region?.trim() || "지역 미입력"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatPhone(row.phone)} · {new Date(row.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}
                  >
                    {CLEANING_INQUIRY_STATUS_LABELS[row.status]}
                  </span>
                </button>
                {open ? (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 text-sm">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-slate-500">연락처</dt>
                        <dd>
                          <a href={`tel:${row.phone}`} className="font-medium text-teal-700">
                            {formatPhone(row.phone)}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">지역</dt>
                        <dd>{row.region?.trim() || "—"}</dd>
                      </div>
                      {row.ref_path || row.ref_slug || row.service_slug ? (
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-slate-500">유입 경로</dt>
                          <dd className="break-all text-slate-700">
                            {row.ref_path || row.ref_slug || row.service_slug}
                          </dd>
                        </div>
                      ) : null}
                      {row.message ? (
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-slate-500">추가 내용</dt>
                          <dd className="whitespace-pre-wrap text-slate-700">{row.message}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["pending", "contacted", "closed"] as CleaningInquiryStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={busy || row.status === st}
                          onClick={() => void saveStatus(row.id, st)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                        >
                          {CLEANING_INQUIRY_STATUS_LABELS[st]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
