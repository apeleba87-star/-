"use client";

import { useCallback, useEffect, useState } from "react";

type Stats =
  | { ok: true; worknetRawCount: number; openPublicCount: number }
  | { ok: false; error?: string };

type RunResult = {
  ok: boolean;
  ingest?: { rowsWritten?: number; keywords?: string[] };
  normalize?: { upserted?: number };
  spotlight?: { scopes?: number };
  error?: string;
};

export default function WorknetIngestPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/sync-worknet-jobs");
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

  const runSync = useCallback(async () => {
    setRunning(true);
    setLastRun(null);
    try {
      const res = await fetch("/api/admin/sync-worknet-jobs?maxRows=300", { method: "POST" });
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
        <h2 className="text-lg font-semibold text-slate-900">고용24 워크넷 · 청소·용역 채용</h2>
        <p className="mt-2 text-sm text-slate-600">
          수집 → <code className="rounded bg-slate-100 px-1 text-xs">public_job_openings</code> 정규화 → Dual
          Spotlight 스냅샷. 화면: <code className="text-xs">/jobs/public</code>
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Cron: <code className="text-xs">/api/cron/sync-worknet-jobs</code> (12시간, 1·13시 UTC) ·{" "}
          <code className="text-xs">WORKNET_API_KEY</code> 필요
        </p>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => void runSync()}
          disabled={running}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? "동기화 중…" : "워크넷 동기화 실행"}
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
            워크넷 raw: <strong>{stats.worknetRawCount.toLocaleString()}</strong>건
          </li>
          <li>
            공개(청소 필터) 공고: <strong>{stats.openPublicCount.toLocaleString()}</strong>건
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
              저장 {lastRun.ingest?.rowsWritten ?? 0}건 · 정규화 {lastRun.normalize?.upserted ?? 0}건 · 스냅샷{" "}
              {lastRun.spotlight?.scopes ?? 0} scope
            </p>
          ) : (
            <p>{lastRun.error ?? "실패"}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
