"use client";

import { useState } from "react";
import { updatePartnerCategory, upsertPartnerCategory } from "./actions";

type Row = {
  code: string;
  label: string;
  is_active: boolean;
  sort_order: number;
};

type Props = {
  rows: Row[];
};

export default function PartnerCategoryManager({ rows }: Props) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState("100");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const res = await upsertPartnerCategory({
      code,
      label,
      sort_order: Number(sortOrder),
      is_active: true,
    });
    if (!res.ok) setError(res.error ?? "업종 추가 실패");
    else window.location.reload();
    setLoading(false);
  }

  async function onToggle(row: Row) {
    if (loading) return;
    setLoading(true);
    setError(null);
    const res = await updatePartnerCategory({
      code: row.code,
      is_active: !row.is_active,
    });
    if (!res.ok) setError(res.error ?? "업종 상태 변경 실패");
    else window.location.reload();
    setLoading(false);
  }

  async function onSort(row: Row, nextSort: number) {
    if (loading) return;
    setLoading(true);
    setError(null);
    const res = await updatePartnerCategory({
      code: row.code,
      sort_order: nextSort,
    });
    if (!res.ok) setError(res.error ?? "업종 정렬 변경 실패");
    else window.location.reload();
    setLoading(false);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">업종 관리</h2>
      </div>
      <div className="space-y-3 p-4">
        <form onSubmit={onCreate} className="grid gap-2 md:grid-cols-4">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="code (ex: window_clean)" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="업종명" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
          <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="정렬순서(작을수록 먼저 노출)" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
          <button type="submit" disabled={loading} className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:bg-slate-400">
            업종 추가
          </button>
        </form>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}

        <div className="divide-y divide-slate-100 rounded border border-slate-200">
          {rows.map((row) => (
            <div key={row.code} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <p className="text-sm text-slate-800">
                <span className="font-medium">{row.label}</span> <span className="text-slate-400">({row.code})</span>
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onSort(row, Math.max(1, row.sort_order - 10))} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">▲</button>
                <span className="text-xs text-slate-500">{row.sort_order}</span>
                <button type="button" onClick={() => onSort(row, row.sort_order + 10)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">▼</button>
                <button
                  type="button"
                  onClick={() => onToggle(row)}
                  className={`rounded px-2 py-1 text-xs font-medium ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                >
                  {row.is_active ? "활성" : "비활성"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
