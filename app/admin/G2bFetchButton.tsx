"use client";

import { useState, useCallback } from "react";

type Result = {
  ok: boolean;
  tenders?: number;
  inserted?: number;
  updated?: number;
  error?: string;
};

const FALLBACK_MSG = "오류가 발생했습니다. API 키·네트워크를 확인하세요.";

function toErrorText(v: unknown): string {
  if (v == null) return FALLBACK_MSG;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" || t === "[object Object]" ? FALLBACK_MSG : t;
  }
  if (typeof v === "object" && v !== null && "message" in v && typeof (v as { message: unknown }).message === "string") {
    return (v as { message: string }).message;
  }
  const s = String(v);
  return s === "[object Object]" ? FALLBACK_MSG : s;
}

export default function G2bFetchButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const runFetch = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/fetch-g2b", { method: "POST" });
      let data: Record<string, unknown>;
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        setResult({
          ok: false,
          error: res.ok ? "응답 파싱 실패" : `서버 오류 (${res.status})`,
        });
        return;
      }
      const ok = data.ok === true;
      const err = data.error;
      const errorStr = ok ? undefined : toErrorText(err ?? (res.ok ? "오류 발생" : `서버 응답 ${res.status}`));
      setResult({
        ok,
        tenders: Number(data.tenders) || 0,
        inserted: Number(data.inserted) || 0,
        updated: Number(data.updated) || 0,
        error: errorStr,
      });
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "요청 실패",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const displayError = result?.error != null ? toErrorText(result.error) : "";

  return (
    <div className="card block">
      <h3 className="text-sm font-medium text-slate-500">나라장터 수집</h3>
      <p className="mt-1 text-sm text-slate-600">
        최근 3일치 입찰 공고를 수집합니다. 추후 cron으로 자동 실행 예정입니다.
      </p>
      <button
        type="button"
        onClick={runFetch}
        disabled={loading}
        className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "수집 중…" : "지금 수집 실행"}
      </button>
      {result && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          {result.ok ? (
            <>
              <p className="font-medium text-emerald-700">수집 성공</p>
              <p className="mt-1 text-slate-700">
                신규 {result.inserted ?? 0}건, 갱신 {result.updated ?? 0}건 (총 {result.tenders ?? 0}건)
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-red-700">수집 실패</p>
              <p className="mt-1 text-red-700">{displayError}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
