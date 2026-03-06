"use client";

import { useState, useCallback } from "react";

type Result = {
  ok: boolean;
  tenders?: number;
  inserted?: number;
  updated?: number;
  error?: string;
};

export default function G2bFetchButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const runFetch = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/fetch-g2b", { method: "POST" });
      const data: Result = await res.json();
      setResult(data);
      if (data.ok) {
        setResult((prev) => ({ ...prev, ...data }));
      }
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "요청 실패",
      });
    } finally {
      setLoading(false);
    }
  }, []);

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
            <p className="text-slate-800">
              완료: 신규 {result.inserted ?? 0}건, 갱신 {result.updated ?? 0}건 (총 {result.tenders ?? 0}건)
            </p>
          ) : (
            <p className="text-red-700">{result.error ?? "오류 발생"}</p>
          )}
        </div>
      )}
    </div>
  );
}
