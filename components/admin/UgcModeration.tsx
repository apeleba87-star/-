"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";

type Item = {
  id: string;
  type: string;
  region: string | null;
  price_per_pyeong: number | null;
  comment?: string | null;
  issue_text?: string | null;
  created_at: string;
  status?: string;
};

export default function UgcModeration({
  pending,
  approved,
}: {
  pending: Item[];
  approved: Item[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: "approved" | "rejected") {
    setLoadingId(id);
    const res = await fetch("/api/admin/ugc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setLoadingId(null);
    if (res.ok) router.refresh();
  }

  const typeLabel: Record<string, string> = {
    field: "현장",
    review: "후기",
    issue: "이슈",
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">검수 대기 ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-slate-500">대기 중인 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((item) => (
              <li key={item.id} className="card flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    {typeLabel[item.type] ?? item.type}
                  </span>
                  {item.region && <span className="ml-2 text-slate-600">{item.region}</span>}
                  {item.price_per_pyeong != null && (
                    <span className="ml-2 text-slate-700">평당 {Number(item.price_per_pyeong).toLocaleString()}원</span>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {item.comment || item.issue_text || "—"}
                  </p>
                  <time className="mt-1 block text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleDateString("ko-KR")}
                  </time>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "approved")}
                    disabled={!!loadingId}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {loadingId === item.id ? "처리 중…" : "승인"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "rejected")}
                    disabled={!!loadingId}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    반려
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">최근 승인 (최대 20건)</h2>
        {approved.length === 0 ? (
          <p className="text-slate-500">승인된 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {approved.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
                <span>{typeLabel[item.type] ?? item.type} · {item.region ?? "—"} · {new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
                <a href={`/ugc/${item.id}`} className="text-blue-600 hover:underline">보기</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
