"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ManageListRow = { id: string; name: string; status: string; created_at: string };

export default function PartnerCompanyManageList({
  rows,
  eventCountByCompany,
}: {
  rows: ManageListRow[];
  eventCountByCompany: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statusOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.status).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const okStatus = statusFilter === "all" || r.status === statusFilter;
      if (!okStatus) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    });
  }, [rows, query, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
          검색
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="업체명 또는 ID"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </label>
        <label className="flex w-full min-w-[140px] flex-col gap-1 text-xs font-medium text-slate-600 sm:w-44">
          상태
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">전체</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500 sm:pb-2">
          {filtered.length} / {rows.length}건 표시
        </p>
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">조건에 맞는 업체가 없습니다.</p>
        ) : (
          filtered.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-500">
                  {row.status} · 등록 {new Date(row.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/admin/partners/${row.id}/edit`} className="text-xs font-semibold text-sky-700 hover:underline">
                  수정
                </Link>
                <Link href={`/admin/partners/${row.id}/portfolio`} className="text-xs font-semibold text-emerald-700 hover:underline">
                  포트폴리오
                </Link>
                <p className="text-sm font-semibold text-slate-800">문의 {eventCountByCompany[row.id] ?? 0}건</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
