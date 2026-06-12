"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateRadarAdInquiry } from "@/app/admin/radar-ads/inquiries/actions";
import {
  RADAR_AD_INQUIRY_STATUS_LABELS,
  radarAdInquiryScopeLabel,
  type RadarAdInquiryStatus,
} from "@/lib/demand/radar-ad-inquiry";
import { RADAR_AD_SLOT_CATEGORY_LABELS, type RadarAdSlotCategory } from "@/lib/demand/radar-ads-shared";

export type RadarAdInquiryRow = {
  id: string;
  created_at: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string | null;
  scope: "national" | "regional" | "both";
  region_interest: string | null;
  category: string | null;
  message: string | null;
  status: RadarAdInquiryStatus;
  admin_note: string | null;
};

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function categoryLabel(cat: string | null): string {
  if (!cat) return "—";
  const key = cat as RadarAdSlotCategory;
  return RADAR_AD_SLOT_CATEGORY_LABELS[key] ?? cat;
}

export default function RadarAdInquiriesPanel({ rows }: { rows: RadarAdInquiryRow[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(rows[0]?.id ?? null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of rows) init[r.id] = r.admin_note ?? "";
    return init;
  });

  async function saveStatus(id: string, status: RadarAdInquiryStatus) {
    setSavingId(id);
    const res = await updateRadarAdInquiry(id, { status });
    setSavingId(null);
    if (res.ok) router.refresh();
    else alert(res.error ?? "저장 실패");
  }

  async function saveNote(id: string) {
    setSavingId(id);
    const res = await updateRadarAdInquiry(id, { admin_note: draftNotes[id] ?? "" });
    setSavingId(null);
    if (res.ok) router.refresh();
    else alert(res.error ?? "저장 실패");
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
        아직 접수된 문의가 없습니다. 공개 페이지:{" "}
        <a href="/advertise" className="font-medium text-teal-700 hover:underline" target="_blank" rel="noreferrer">
          /advertise
        </a>
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {rows.map((row) => {
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
                  {row.company_name}
                  <span className="ml-2 text-sm font-normal text-slate-500">{row.contact_name}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {radarAdInquiryScopeLabel(row.scope)}
                  {row.region_interest ? ` · ${row.region_interest}` : ""} ·{" "}
                  {new Date(row.created_at).toLocaleString("ko-KR")}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  row.status === "new"
                    ? "bg-amber-100 text-amber-800"
                    : row.status === "won"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {RADAR_AD_INQUIRY_STATUS_LABELS[row.status]}
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
                      {row.email ? (
                        <span className="ml-2 text-slate-600">{row.email}</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">업종</dt>
                    <dd>{categoryLabel(row.category)}</dd>
                  </div>
                  {row.message ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-slate-500">문의 내용</dt>
                      <dd className="whitespace-pre-wrap text-slate-700">{row.message}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["new", "contacted", "won", "lost"] as RadarAdInquiryStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={busy || row.status === st}
                      onClick={() => void saveStatus(row.id, st)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                    >
                      {RADAR_AD_INQUIRY_STATUS_LABELS[st]}
                    </button>
                  ))}
                </div>
                <label className="mt-4 block">
                  <span className="text-xs font-medium text-slate-600">관리자 메모</span>
                  <textarea
                    value={draftNotes[row.id] ?? ""}
                    onChange={(e) =>
                      setDraftNotes((d) => ({ ...d, [row.id]: e.target.value }))
                    }
                    rows={2}
                    className="input mt-1 w-full text-sm"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveNote(row.id)}
                  className="mt-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  메모 저장
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
