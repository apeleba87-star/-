"use client";

import { useState } from "react";
import { addTenderKeyword, updateTenderKeyword, deleteTenderKeyword, runBackfillAction } from "./actions";

type Row = {
  id: string;
  keyword: string;
  keyword_type: string | null;
  category: string | null;
  sort_order: number;
  enabled: boolean;
};

export default function TenderKeywordsForm({ initialKeywords }: { initialKeywords: Row[] }) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [newType, setNewType] = useState<"include" | "exclude">("include");
  const [newCategory, setNewCategory] = useState<"cleaning" | "disinfection">("cleaning");
  const [newSort, setNewSort] = useState(0);
  const [loading, setLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const kw = newKeyword.trim();
    if (!kw) return;
    setLoading(true);
    setMessage(null);
    const res = await addTenderKeyword(kw, newType, newSort, newType === "include" ? newCategory : null);
    setLoading(false);
    if (res.ok && res.row) {
      setKeywords((prev) => [...prev, res.row!]);
      setNewKeyword("");
      setMessage({ ok: true, text: "추가되었습니다." });
    } else {
      setMessage({ ok: false, text: res.error ?? "추가 실패" });
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await updateTenderKeyword(id, { enabled: !enabled });
    if (res.ok)
      setKeywords((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r)));
  }

  async function handleDelete(id: string) {
    if (!confirm("이 키워드를 삭제할까요?")) return;
    const res = await deleteTenderKeyword(id);
    if (res.ok) setKeywords((prev) => prev.filter((r) => r.id !== id));
    else setMessage({ ok: false, text: res.error ?? "삭제 실패" });
  }

  async function handleBackfill() {
    setBackfillLoading(true);
    setMessage(null);
    const result = await runBackfillAction();
    setBackfillLoading(false);
    if (result.ok) {
      setMessage({ ok: true, text: `기존 공고 ${result.updated}건에 키워드 반영했습니다. 입찰 공고 목록을 새로고침하세요.` });
    } else {
      setMessage({ ok: false, text: result.error ?? "반영 실패" });
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">키워드</span>
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="예: 청소, 청소년"
            className="w-40 rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">구분</span>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "include" | "exclude")}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="include">포함 (업종 매칭)</option>
            <option value="exclude">제외 (공통 제외)</option>
          </select>
        </label>
        {newType === "include" && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">업종</span>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as "cleaning" | "disinfection")}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="cleaning">청소 관련</option>
              <option value="disinfection">소독·방역 관련</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">순서</span>
          <input
            type="number"
            value={newSort}
            onChange={(e) => setNewSort(Number(e.target.value) || 0)}
            className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          추가
        </button>
      </form>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBackfill}
          disabled={backfillLoading}
          className="rounded border border-emerald-600 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
        >
          {backfillLoading ? "반영 중…" : "키워드 반영 (기존 공고에 적용)"}
        </button>
        <span className="text-xs text-slate-500">제외 키워드 추가·수정 후 누르면 청소 관련 목록에 바로 반영됩니다.</span>
      </div>

      {message && (
        <p className={message.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {message.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="p-3 font-semibold text-slate-800">키워드</th>
              <th className="p-3 font-semibold text-slate-800">구분</th>
              <th className="p-3 font-semibold text-slate-800">업종</th>
              <th className="p-3 font-semibold text-slate-800">순서</th>
              <th className="p-3 font-semibold text-slate-800">사용</th>
              <th className="p-3 font-semibold text-slate-800">동작</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="p-3 font-medium">{r.keyword}</td>
                <td className="p-3">
                  <span
                    className={
                      r.keyword_type === "exclude"
                        ? "rounded bg-amber-100 px-1.5 py-0.5 text-amber-800"
                        : "rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800"
                    }
                  >
                    {r.keyword_type === "exclude" ? "제외" : "포함"}
                  </span>
                </td>
                <td className="p-3 text-slate-600">
                  {r.keyword_type === "exclude" ? "공통" : r.category === "disinfection" ? "소독·방역" : "청소"}
                </td>
                <td className="p-3 text-slate-600">{r.sort_order}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(r.id, r.enabled)}
                    className="text-blue-600 hover:underline"
                  >
                    {r.enabled ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="text-red-600 hover:underline"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {keywords.length === 0 && (
        <p className="text-slate-500">등록된 키워드가 없습니다. 위 폼에서 추가하세요.</p>
      )}
    </div>
  );
}
