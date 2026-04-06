"use client";

import { useCallback, useEffect, useState } from "react";

type Stats = { ok: true; totalCount: number; seoulGetJobInfoCount: number } | { ok: false; error?: string };

type RunResult = {
  ok: boolean;
  seoul?: {
    pages: number;
    rowsWritten: number;
    listTotalCount: number;
    lastResultCode?: string;
    error?: string;
  };
  error?: string;
};

export default function PublicJobRawIngestPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/ingest-public-job-raw", { method: "GET" });
      const j = (await res.json()) as Stats & { error?: string };
      if (!res.ok) {
        setStats({ ok: false, error: j.error ?? `오류 (${res.status})` });
        return;
      }
      setStats(j as Stats);
    } catch {
      setStats({ ok: false, error: "통계를 불러오지 못했습니다." });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const runIngest = useCallback(async () => {
    setRunning(true);
    setLastRun(null);
    try {
      const res = await fetch("/api/admin/ingest-public-job-raw?maxRows=1500&pageSize=500", { method: "POST" });
      const j = (await res.json()) as RunResult;
      setLastRun(j);
      await loadStats();
    } catch (e) {
      setLastRun({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunning(false);
    }
  }, [loadStats]);

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">공공 일자리 원천 수집</h2>
        <p className="mt-2 text-sm text-slate-600">
          서울 열린데이터광장 <code className="rounded bg-slate-100 px-1 text-xs">GetJobInfo</code> API로 채용
          공고를 가져와 <code className="rounded bg-slate-100 px-1 text-xs">job_open_data_raw</code> 테이블에
          저장합니다. 정규화·구인 목록 반영은 이후 단계에서 진행합니다.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          자동 수집: Vercel Cron <code className="text-xs">/api/cron/fetch-public-job-raw</code> (키·시크릿 설정 시).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => void runIngest()}
          disabled={running}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? "수집 중…" : "지금 수집 실행"}
        </button>
        <button
          type="button"
          onClick={() => void loadStats()}
          disabled={statsLoading}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          통계 새로고침
        </button>
      </div>

      <div className="text-sm text-slate-600">
        {statsLoading ? (
          <p>통계 불러오는 중…</p>
        ) : stats?.ok === true ? (
          <ul className="list-inside list-disc space-y-1">
            <li>원천 테이블 전체: <strong>{stats.totalCount.toLocaleString()}</strong>건</li>
            <li>
              서울 GetJobInfo: <strong>{stats.seoulGetJobInfoCount.toLocaleString()}</strong>건
            </li>
          </ul>
        ) : (
          <p className="text-red-600">{stats && "error" in stats ? stats.error : "통계를 표시할 수 없습니다."}</p>
        )}
      </div>

      {lastRun && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            lastRun.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {lastRun.ok && lastRun.seoul ? (
            <div className="space-y-1">
              <p className="font-medium">수집 완료</p>
              <p>
                처리 페이지: {lastRun.seoul.pages}, 저장(또는 갱신) 행:{" "}
                <strong>{lastRun.seoul.rowsWritten.toLocaleString()}</strong>
              </p>
              <p>API 전체 건수(참고): {lastRun.seoul.listTotalCount.toLocaleString()}</p>
              <p className="text-xs opacity-80">결과 코드: {lastRun.seoul.lastResultCode ?? "—"}</p>
            </div>
          ) : (
            <p>{lastRun.error ?? lastRun.seoul?.error ?? "수집에 실패했습니다."}</p>
          )}
        </div>
      )}
    </div>
  );
}
