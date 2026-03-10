"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

type Result = {
  ok: boolean;
  tenders?: number;
  inserted?: number;
  updated?: number;
  error?: string;
};

type Progress = {
  phase: string;
  total?: number;
  done?: number;
  message?: string;
};

const FALLBACK_MSG = "오류가 발생했습니다. API 키·네트워크를 확인하세요.";

function toErrorText(v: unknown): string {
  if (v == null) return FALLBACK_MSG;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" || t === "[object Object]" ? FALLBACK_MSG : t;
  }
  if (typeof v === "object" && v !== null) {
    if ("message" in v && typeof (v as { message: unknown }).message === "string") {
      return (v as { message: string }).message;
    }
    try {
      const s = JSON.stringify(v);
      if (s && s !== "{}") return s;
    } catch {
      // ignore
    }
  }
  const s = String(v);
  return s === "[object Object]" ? FALLBACK_MSG : s;
}

export default function G2bFetchButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const runFetch = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setProgress(null);
    try {
      const res = await fetch("/api/admin/fetch-g2b?stream=1", { method: "POST" });
      if (!res.ok || !res.body) {
        const text = await res.text();
        let err: string;
        try {
          const j = JSON.parse(text) as { error?: string };
          err = (j?.error ?? text) || `서버 오류 (${res.status})`;
        } catch {
          err = text || `서버 오류 (${res.status})`;
        }
        setResult({ ok: false, error: err });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let gotComplete = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try {
            const data = JSON.parse(t) as { type?: string; phase?: string; total?: number; done?: number; message?: string; ok?: boolean; tenders?: number; inserted?: number; updated?: number; error?: string };
            if (data.type === "progress") {
              setProgress({
                phase: data.phase ?? "upsert",
                total: data.total,
                done: data.done,
                message: data.message,
              });
            } else if (data.type === "complete") {
              gotComplete = true;
              const err = data.ok
                ? undefined
                : (typeof data.error === "string" && data.error.trim()
                    ? data.error.trim()
                    : data.error != null && typeof data.error === "object" && "message" in data.error
                      ? String((data.error as { message: unknown }).message)
                      : data.error != null
                        ? String(data.error)
                        : "수집 실패. 서버에서 오류 내용을 받지 못했습니다. (중간에 끊겼거나 시간 초과일 수 있습니다.)");
              setResult({
                ok: data.ok === true,
                tenders: Number(data.tenders) ?? 0,
                inserted: Number(data.inserted) ?? 0,
                updated: Number(data.updated) ?? 0,
                error: err,
              });
              setProgress(null);
            }
          } catch {
            // skip malformed line
          }
        }
      }
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim()) as { type?: string; phase?: string; total?: number; done?: number; message?: string; ok?: boolean; tenders?: number; inserted?: number; updated?: number; error?: string };
          if (data.type === "complete") {
            gotComplete = true;
            const err = data.ok
              ? undefined
              : (typeof data.error === "string" && data.error.trim()
                  ? data.error.trim()
                  : data.error != null && typeof data.error === "object" && "message" in data.error
                    ? String((data.error as { message: unknown }).message)
                    : data.error != null
                      ? String(data.error)
                      : "수집 실패. 서버에서 오류 내용을 받지 못했습니다. (중간에 끊겼거나 시간 초과일 수 있습니다.)");
            setResult({
              ok: data.ok === true,
              tenders: Number(data.tenders) ?? 0,
              inserted: Number(data.inserted) ?? 0,
              updated: Number(data.updated) ?? 0,
              error: err,
            });
            setProgress(null);
          }
        } catch {
          // ignore
        }
      }
      if (!gotComplete) {
        setResult({
          ok: false,
          error: "수집이 중간에 끊겼습니다. 연결 시간 초과일 수 있습니다. 잠시 후 다시 시도해 보세요.",
        });
        setProgress(null);
      }
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "요청 실패",
      });
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const displayError = result?.error != null ? toErrorText(result.error) : "";

  return (
    <div className="card block">
      <h3 className="text-sm font-medium text-slate-500">나라장터 수집</h3>
      <p className="mt-1 text-sm text-slate-600">
        최근 1일치 입찰 공고를 수집합니다. 추후 cron으로 자동 실행 예정입니다.
      </p>
      <button
        type="button"
        onClick={runFetch}
        disabled={loading}
        className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "수집 중…" : "지금 수집 실행"}
      </button>

      {loading && progress && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
          <p className="font-medium text-slate-700">
            {progress.phase === "fetch" ? progress.message : progress.message ?? "저장 중…"}
          </p>
          {progress.total != null && progress.total > 0 && (
            <>
              <p className="mt-1 text-slate-600">
                총 <span className="font-semibold text-blue-600">{progress.total.toLocaleString()}</span>건 중{" "}
                <span className="font-semibold text-blue-600">{(progress.done ?? 0).toLocaleString()}</span>건 수집 중
              </p>
              <p className="mt-0.5 text-slate-500">
                <span className="font-medium text-amber-600">
                  {progress.total && progress.total > 0
                    ? `${Math.round(100 - ((progress.done ?? 0) / progress.total) * 100)}% 남음`
                    : "—"}
                </span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, ((progress.done ?? 0) / progress.total) * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {result && !loading && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          {result.ok ? (
            <>
              <p className="font-medium text-emerald-700">수집 성공</p>
              <p className="mt-1 text-slate-700">
                신규 {result.inserted ?? 0}건, 갱신 {result.updated ?? 0}건 (총 {result.tenders ?? 0}건)
              </p>
              <p className="mt-1.5 text-sm text-slate-600">
                <Link href="/tenders" className="underline hover:text-slate-900">
                  입찰 공고
                </Link>
                에서 새 데이터를 확인하세요. 등록일순 정렬로 최신 공고를 먼저 볼 수 있습니다.
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
