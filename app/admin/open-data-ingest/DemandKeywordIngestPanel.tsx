"use client";

import { useCallback, useEffect, useState } from "react";

type Stats = { ok: true; dailyRows: number; monthlyRows: number } | { ok: false; error?: string };

type RunResult = {
  ok: boolean;
  datalab?: { ok: boolean; inserted?: number; startDate?: string; endDate?: string; error?: string };
  searchAd?: { ok: boolean; inserted?: number; yyyymm?: string; skipped?: boolean; error?: string };
  error?: string;
};

export default function DemandKeywordIngestPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/ingest-demand-keywords");
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
      const res = await fetch("/api/admin/ingest-demand-keywords", { method: "POST" });
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
        <h2 className="text-lg font-semibold text-slate-900">입주수요 검색 지표 수집</h2>
        <p className="mt-2 text-sm text-slate-600">
          데이터랩 일별 지수 → <code className="rounded bg-slate-100 px-1 text-xs">demand_keyword_daily</code>
          , 검색광고 월별 검색량 →{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">demand_keyword_monthly</code>
        </p>
        <p className="mt-2 text-sm text-slate-500">
          키: <code className="text-xs">NAVER_CLIENT_ID</code>, <code className="text-xs">NAVER_CLIENT_SECRET</code>
          (네이버 트렌드와 동일). 로컬에 없으면{" "}
          <strong>마케팅 트렌드 DB</strong>에서 포장이사·입주청소 그룹을 자동 복사합니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => void runIngest()}
          disabled={running}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? "수집 중…" : "검색 지표 수집 실행"}
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
            일별 지수 행: <strong>{stats.dailyRows.toLocaleString()}</strong>
          </li>
          <li>
            월별 검색량 행: <strong>{stats.monthlyRows.toLocaleString()}</strong>
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
            <div className="space-y-1">
              <p>
                DataLab: {lastRun.datalab?.ok ? "OK" : "실패"} ·{" "}
                {"source" in (lastRun.datalab ?? {}) && lastRun.datalab?.source === "naver_trend_datapoints"
                  ? `트렌드 DB 복사 · ${(lastRun.datalab as { matched?: string[] }).matched?.join(", ") ?? ""}`
                  : `${(lastRun.datalab as { startDate?: string }).startDate ?? ""}~${(lastRun.datalab as { endDate?: string }).endDate ?? ""}`}{" "}
                · {lastRun.datalab && "inserted" in lastRun.datalab ? lastRun.datalab.inserted : 0}행
              </p>
              <p>
                검색광고:{" "}
                {lastRun.searchAd?.skipped
                  ? "스킵(키 없음)"
                  : lastRun.searchAd?.ok
                    ? `OK · ${lastRun.searchAd.yyyymm} · ${lastRun.searchAd.inserted ?? 0}행`
                    : `실패 — ${lastRun.searchAd?.error ?? ""}`}
              </p>
            </div>
          ) : (
            <p>{lastRun.error ?? lastRun.datalab?.error ?? "실패"}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
