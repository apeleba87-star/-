"use client";

import { useCallback, useEffect, useState } from "react";

type Stats =
  | { ok: true; totalRows: number; latestMonth: string | null }
  | { ok: false; error?: string };

type RunResult = {
  ok: boolean;
  inserted?: number;
  updated?: number;
  period?: string;
  months?: number;
  districts?: number;
  calls?: number;
  error?: string;
  needsKey?: boolean;
};

export default function DemandRtmsIngestPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/ingest-demand-rtms");
      const j = (await res.json()) as Stats;
      setStats(res.ok ? j : { ok: false, error: (j as { error?: string }).error });
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
      const res = await fetch("/api/admin/ingest-demand-rtms", { method: "POST" });
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
    <div className="card mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">입주수요 RTMS 수집</h2>
        <p className="mt-2 text-sm text-slate-600">
          서울 25구 아파트 매매·전월세 실거래를 월 단위로 수집해{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">demand_rtms_monthly</code>에 저장합니다.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          필요 키: <code className="text-xs">MOLIT_RTMS_TRADE_SERVICE_KEY</code>,{" "}
          <code className="text-xs">MOLIT_RTMS_RENT_SERVICE_KEY</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => void runIngest()}
          disabled={running}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? "수집 중…" : "RTMS 수집 실행"}
        </button>
        <button
          type="button"
          onClick={() => void loadStats()}
          disabled={statsLoading}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
        >
          통계 새로고침
        </button>
      </div>

      {statsLoading ? (
        <p className="text-sm text-slate-500">통계 불러오는 중…</p>
      ) : stats?.ok ? (
        <ul className="list-inside list-disc text-sm text-slate-600">
          <li>
            저장 행 수: <strong>{stats.totalRows.toLocaleString()}</strong>
          </li>
          <li>
            최신 기준월: <strong>{stats.latestMonth ?? "-"}</strong>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-red-600">{stats && "error" in stats ? stats.error : "—"}</p>
      )}

      {lastRun ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            lastRun.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
          }`}
        >
          {lastRun.ok ? (
            <p>
              완료: {lastRun.period} · 저장 {lastRun.inserted ?? 0}건 · 대상 {lastRun.districts ?? 0}구 · 호출{" "}
              {lastRun.calls ?? 0}회
            </p>
          ) : (
            <p>{lastRun.error ?? "실패"}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
