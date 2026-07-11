"use client";

import { useState } from "react";

type ProductRow = {
  id: string;
  name: string;
  salesUrl: string | null;
  salesLabel: string | null;
};

type Props = {
  products: ProductRow[];
};

export default function AdminProductSalesEditor({ products: initial }: Props) {
  const [rows, setRows] = useState(initial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(productId: string) {
    const row = rows.find((r) => r.id === productId);
    if (!row) return;
    setSavingId(productId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/knowledge-product-sales/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesUrl: row.salesUrl?.trim() || null,
          salesLabel: row.salesLabel?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "저장 실패");
      } else {
        setMessage(`${row.name} 판매 링크 저장됨`);
      }
    } catch {
      setMessage("네트워크 오류");
    } finally {
      setSavingId(null);
    }
  }

  function update(id: string, patch: Partial<ProductRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <section id="products" className="scroll-mt-20 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h2 className="font-bold text-slate-900">
          제품 · 판매 링크 <span className="text-sm font-normal text-slate-500">({rows.length})</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          http(s) URL만 저장됩니다. 비우면 구매 CTA가 숨겨집니다. (마이그레이션 191 필요)
        </p>
        {message ? <p className="mt-2 text-xs font-medium text-teal-700">{message}</p> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-500">
              <th className="px-4 py-2 font-medium">제품</th>
              <th className="px-4 py-2 font-medium">판매 URL</th>
              <th className="px-4 py-2 font-medium">버튼 문구</th>
              <th className="px-4 py-2 font-medium">저장</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 align-top">
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="font-mono text-xs text-slate-400">{p.id}</div>
                  <a href={`/products/${p.id}`} className="text-xs font-bold text-teal-700 hover:underline">
                    보기
                  </a>
                </td>
                <td className="px-4 py-2 align-top">
                  <input
                    type="url"
                    value={p.salesUrl ?? ""}
                    onChange={(e) => update(p.id, { salesUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full min-w-[220px] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <input
                    type="text"
                    value={p.salesLabel ?? ""}
                    onChange={(e) => update(p.id, { salesLabel: e.target.value })}
                    placeholder="구매하기"
                    className="w-full min-w-[120px] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <button
                    type="button"
                    onClick={() => save(p.id)}
                    disabled={savingId === p.id}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {savingId === p.id ? "저장 중…" : "저장"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
