"use client";

import { useState } from "react";
import { updatePartnerRegion, upsertPartnerRegion } from "./actions";

type Row = {
  code: string;
  label: string;
  parent_code: string | null;
  is_active: boolean;
  sort_order: number;
};

type Props = {
  rows: Row[];
};

export default function PartnerRegionManager({ rows }: Props) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [parentCode, setParentCode] = useState("");
  const [sortOrder, setSortOrder] = useState("100");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const roots = rows
    .filter((r) => !r.parent_code || !byCode.has(r.parent_code))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "ko"));
  const childrenByParent = new Map<string, Row[]>();
  for (const row of rows) {
    if (!row.parent_code) continue;
    const curr = childrenByParent.get(row.parent_code) ?? [];
    curr.push(row);
    childrenByParent.set(row.parent_code, curr);
  }
  for (const [key, arr] of childrenByParent) {
    childrenByParent.set(
      key,
      [...arr].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "ko"))
    );
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const res = await upsertPartnerRegion({
      code,
      label,
      parent_code: parentCode || null,
      sort_order: Number(sortOrder),
      is_active: true,
    });
    if (!res.ok) setError(res.error ?? "지역 추가 실패");
    else window.location.reload();
    setLoading(false);
  }

  async function onToggle(row: Row) {
    if (loading) return;
    setLoading(true);
    setError(null);
    const res = await updatePartnerRegion({
      code: row.code,
      is_active: !row.is_active,
    });
    if (!res.ok) setError(res.error ?? "지역 상태 변경 실패");
    else window.location.reload();
    setLoading(false);
  }

  async function onSort(row: Row, nextSort: number) {
    if (loading) return;
    setLoading(true);
    setError(null);
    const res = await updatePartnerRegion({
      code: row.code,
      sort_order: nextSort,
    });
    if (!res.ok) setError(res.error ?? "지역 정렬 변경 실패");
    else window.location.reload();
    setLoading(false);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">활동 지역 관리</h2>
      </div>
      <div className="space-y-3 p-4">
        <form onSubmit={onCreate} className="grid gap-2 md:grid-cols-5">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="code (ex: seoul_gangnam)" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="지역명" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
          <select
            value={parentCode}
            onChange={(e) => setParentCode(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">parent 없음 (상위)</option>
            {rows.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label} ({r.code})
              </option>
            ))}
          </select>
          <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="정렬순서(작을수록 먼저 노출)" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
          <button type="submit" disabled={loading} className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:bg-slate-400">
            지역 추가
          </button>
        </form>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}

        <div className="space-y-2 rounded border border-slate-200 p-2">
          {roots.map((root) => {
            const children = childrenByParent.get(root.code) ?? [];
            return (
              <div key={root.code} className="rounded border border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{root.label}</span>
                    <span className="ml-1 text-slate-400">({root.code})</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onSort(root, Math.max(1, root.sort_order - 10))} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">▲</button>
                    <span className="text-xs text-slate-500">{root.sort_order}</span>
                    <button type="button" onClick={() => onSort(root, root.sort_order + 10)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">▼</button>
                    <button
                      type="button"
                      onClick={() => onToggle(root)}
                      className={`rounded px-2 py-1 text-xs font-medium ${root.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                    >
                      {root.is_active ? "활성" : "비활성"}
                    </button>
                  </div>
                </div>
                {children.length > 0 ? (
                  <div className="space-y-1 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
                    {children.map((child) => (
                      <div key={child.code} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 bg-white px-2 py-1.5">
                        <p className="text-xs text-slate-700">
                          {root.label} <span className="text-slate-400">&gt;</span> {child.label}
                          <span className="ml-1 text-slate-400">({child.code})</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => onSort(child, Math.max(1, child.sort_order - 10))} className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-700">▲</button>
                          <span className="text-[11px] text-slate-500">{child.sort_order}</span>
                          <button type="button" onClick={() => onSort(child, child.sort_order + 10)} className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-700">▼</button>
                          <button
                            type="button"
                            onClick={() => onToggle(child)}
                            className={`rounded px-2 py-0.5 text-[11px] font-medium ${child.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                          >
                            {child.is_active ? "활성" : "비활성"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
