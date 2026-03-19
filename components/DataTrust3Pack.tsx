"use client";

import { Database, Clock3, BarChart3 } from "lucide-react";

function formatUpdatedAt(updatedAt?: string | null): string {
  if (!updatedAt) return "—";
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  source: string;
  updatedAt?: string | null;
  sampleCount?: number | null;
};

export default function DataTrust3Pack({ source, updatedAt, sampleCount }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-slate-600" aria-hidden />
            <dt className="text-slate-500">출처</dt>
            <dd className="font-medium text-slate-800">{source}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-slate-600" aria-hidden />
            <dt className="text-slate-500">마지막 업데이트</dt>
            <dd className="font-medium text-slate-800">{formatUpdatedAt(updatedAt)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-slate-600" aria-hidden />
            <dt className="text-slate-500">표본 기준</dt>
            <dd className="font-medium text-slate-800">{sampleCount != null && sampleCount >= 0 ? `${sampleCount}건` : "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

