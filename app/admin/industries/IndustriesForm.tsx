"use client";

import { useState } from "react";
import { addIndustry, updateIndustry, deleteIndustry } from "./actions";

type Row = {
  id: string;
  code: string;
  name: string;
  group_key: string | null;
  sort_order: number;
  is_active: boolean;
};

const GROUP_OPTIONS = [
  { value: "", label: "—" },
  { value: "cleaning", label: "청소" },
  { value: "disinfection", label: "방역·소독" },
  { value: "facility", label: "시설관리" },
  { value: "labor", label: "근로·파견" },
];

export default function IndustriesForm({ initialIndustries }: { initialIndustries: Row[] }) {
  const [industries, setIndustries] = useState(initialIndustries);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [groupKey, setGroupKey] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{
    processed: number;
    total: number | null;
    percent: number | null;
    updated: number;
    message: string;
  } | null>(null);
  const [clearAllLoading, setClearAllLoading] = useState(false);

  async function handleClearAllTenders() {
    if (!confirm("DB에 저장된 입찰 공고를 모두 삭제하고 수집 체크포인트를 초기화합니다. 삭제 후 API 수집을 다시 실행하면 됩니다. 계속할까요?")) return;
    setClearAllLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/clear-all-tenders", { method: "POST" });
      const text = await res.text();
      let data: { ok?: boolean; error?: string; message?: string; deleted_tenders?: number } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setMessage({
          ok: false,
          text: res.ok
            ? "응답을 읽을 수 없습니다. 삭제 건수가 많으면 타임아웃될 수 있습니다. 잠시 후 다시 시도하거나 수집을 먼저 중단한 뒤 삭제해 보세요."
            : `서버 오류 (${res.status}). 응답이 비어 있을 수 있습니다.`,
        });
        setClearAllLoading(false);
        return;
      }
      if (data.ok) {
        setMessage({ ok: true, text: data.message ?? `입찰 공고 ${data.deleted_tenders ?? 0}건 삭제 및 체크포인트 초기화 완료.` });
      } else {
        setMessage({ ok: false, text: data.error ?? "삭제 실패" });
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "요청 실패" });
    }
    setClearAllLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    const n = name.trim();
    if (!c || !n) return;
    setLoading(true);
    setMessage(null);
    const res = await addIndustry(c, n, groupKey || null, sortOrder);
    setLoading(false);
    if (res.ok && res.row) {
      setIndustries((prev) => [...prev, res.row!]);
      setCode("");
      setName("");
      setGroupKey("");
      setSortOrder(0);
      setMessage({ ok: true, text: "추가되었습니다." });
    } else {
      setMessage({ ok: false, text: res.error ?? "추가 실패" });
    }
  }

  async function handleToggle(id: string, is_active: boolean) {
    const res = await updateIndustry(id, { is_active: !is_active });
    if (res.ok)
      setIndustries((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: !is_active } : r)));
  }

  async function handleDelete(id: string) {
    if (!confirm("이 업종을 삭제할까요? 해당 업종이 연결된 공고 매핑도 함께 제거됩니다.")) return;
    const res = await deleteIndustry(id);
    if (res.ok) setIndustries((prev) => prev.filter((r) => r.id !== id));
    else setMessage({ ok: false, text: res.error ?? "삭제 실패" });
  }

  async function handleBackfill(force = false) {
    setBackfillLoading(true);
    setMessage(null);
    setBackfillProgress(null);
    try {
      const base = "/api/admin/backfill-tender-industries";
      const url = `${base}?stream=1${force ? "&force=true" : ""}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setMessage({ ok: false, text: data.error ?? `요청 실패 (${res.status})` });
        setBackfillLoading(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed) as { type: string; processed?: number; updated?: number; total?: number | null; percent?: number | null; message?: string; ok?: boolean; error?: string };
            if (data.type === "progress") {
              setBackfillProgress({
                processed: data.processed ?? 0,
                total: data.total ?? null,
                percent: data.percent ?? null,
                updated: data.updated ?? 0,
                message: data.message ?? "처리 중…",
              });
            } else if (data.type === "complete") {
              if (data.ok) {
                setMessage({
                  ok: true,
                  text: `업종 백필 완료: ${data.processed ?? 0}건 처리, ${data.updated ?? 0}건 업종 매핑됨.${force ? " (전량 재계산)" : " (미분류만)"}`,
                });
              } else {
                setMessage({ ok: false, text: data.error ?? "백필 실패" });
              }
              setBackfillProgress(null);
            }
          } catch {
            // ignore parse errors for partial lines
          }
        }
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "요청 실패" });
      setBackfillProgress(null);
    }
    setBackfillLoading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">code</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="building_sanitation"
            className="w-44 rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">한글명</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="건물위생관리업"
            className="w-40 rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">그룹</span>
          <select
            value={groupKey}
            onChange={(e) => setGroupKey(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value || "x"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">순서</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className="w-16 rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "추가 중…" : "추가"}
        </button>
      </form>

      {message && (
        <p className={message.ok ? "text-green-700" : "text-red-600"}>{message.text}</p>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => handleBackfill(false)}
            disabled={backfillLoading}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {backfillLoading ? "백필 실행 중…" : "기존 공고 업종 백필 (미분류만)"}
          </button>
          <button
            type="button"
            onClick={() => handleBackfill(true)}
            disabled={backfillLoading}
            className="rounded border border-amber-600 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
          >
            전량 재계산(force)
          </button>
          <span className="text-xs text-slate-500">기본: primary_industry_code 없는 행만. force: 전량 재계산</span>
        </div>
        {backfillProgress && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
            <p className="mb-2 text-sm font-medium text-amber-900">업종 백필 진행 중</p>
            <p className="mb-2 text-sm text-amber-800">{backfillProgress.message}</p>
            {backfillProgress.percent != null && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200">
                <div
                  className="h-full rounded-full bg-amber-600 transition-[width] duration-300"
                  style={{ width: `${Math.min(100, backfillProgress.percent)}%` }}
                />
              </div>
            )}
            {backfillProgress.total != null && (
              <p className="mt-2 text-xs text-amber-700">
                {backfillProgress.processed} / {backfillProgress.total}건 · 업종 매핑 {backfillProgress.updated}건
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-red-200 bg-red-50/80 p-4">
          <p className="mb-2 text-sm font-medium text-red-900">입찰 공고 전체 삭제 (재시작)</p>
          <p className="mb-2 text-xs text-red-800">
            DB에 저장된 입찰 공고를 모두 삭제하고 수집 체크포인트를 초기화합니다. 삭제 후 G2B 수집을 다시 실행하면 됩니다.
          </p>
          <button
            type="button"
            onClick={handleClearAllTenders}
            disabled={clearAllLoading}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {clearAllLoading ? "삭제 중…" : "입찰 공고 전체 삭제"}
          </button>
        </div>
      </div>

      <table className="w-full border-collapse rounded-lg border border-slate-200">
        <thead>
          <tr className="bg-slate-100">
            <th className="border-b border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800">code</th>
            <th className="border-b border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800">한글명</th>
            <th className="border-b border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800">그룹</th>
            <th className="border-b border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800">순서</th>
            <th className="border-b border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800">사용</th>
            <th className="border-b border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800"></th>
          </tr>
        </thead>
        <tbody>
          {industries.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="px-3 py-2 text-sm font-mono text-slate-700">{r.code}</td>
              <td className="px-3 py-2 text-sm text-slate-800">{r.name}</td>
              <td className="px-3 py-2 text-sm text-slate-600">{r.group_key ?? "—"}</td>
              <td className="px-3 py-2 text-sm text-slate-600">{r.sort_order}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => handleToggle(r.id, r.is_active)}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${r.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}
                >
                  {r.is_active ? "ON" : "OFF"}
                </button>
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
