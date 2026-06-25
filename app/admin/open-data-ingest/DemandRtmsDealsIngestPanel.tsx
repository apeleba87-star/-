"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMAND_REGIONS } from "@/lib/demand/regions";

type Stats =
  | {
      ok: true;
      totalRows: number;
      latestMonth: string | null;
      jobStats?: {
        ok: true;
        batchKey: string | null;
        total: number;
        pending: number;
        running: number;
        success: number;
        failed: number;
      } | { ok: false; error?: string };
    }
  | { ok: false; error?: string };

type RunResult = {
  ok: boolean;
  batchKey?: string;
  housingTypes?: string[];
  period?: string;
  months?: number;
  districts?: number;
  sourceGroups?: number;
  calls?: number;
  rows?: number;
  jobs?: number;
  claimed?: number;
  processed?: number;
  succeeded?: number;
  failed?: number;
  reset?: number;
  cityId?: string;
  error?: string;
  needsKey?: boolean;
};

export default function DemandRtmsDealsIngestPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [cityId, setCityId] = useState("seoul");

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/ingest-demand-rtms-deals");
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

  const runIngest = useCallback(
    async (monthsBack: number) => {
      setRunning(true);
      setLastRun(null);
      try {
        const res = await fetch("/api/admin/ingest-demand-rtms-deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthsBack,
            ...(cityId ? { cityId } : {}),
          }),
        });
        const j = (await res.json()) as RunResult;
        setLastRun(j);
        await loadStats();
      } catch (e) {
        setLastRun({ ok: false, error: e instanceof Error ? e.message : String(e) });
      } finally {
        setRunning(false);
      }
    },
    [cityId, loadStats]
  );

  const jobStats = stats?.ok && stats.jobStats?.ok ? stats.jobStats : null;
  const jobProgress = jobStats?.total ? Math.round((jobStats.success / jobStats.total) * 1000) / 10 : 0;

  return (
    <div className="card mt-8 space-y-4 border-teal-100 bg-teal-50/30">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">이사검색 RTMS 실거래 원자료 수집</h2>
        <p className="mt-2 text-sm text-slate-600">
          아파트·빌라/연립·오피스텔·단독/다가구 매매·전월세 원자료를 최근 2개월 기준으로 수집해{" "}
          <code className="rounded bg-white px-1 text-xs">demand_rtms_deals</code>에 저장합니다.
          이 데이터가 <code className="text-xs">/move</code> 예산 검색 결과에 사용됩니다.
        </p>
        <p className="mt-2 text-sm text-amber-800">
          지금은 수동 수집만 사용합니다. 선택한 시·도 최근 2개월치를 한 번에 수집하므로 서울·경기처럼 큰 지역은 로컬에서 실행하는 것을 권장합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-teal-100 pt-4">
        <div>
          <label htmlFor="rtms-deals-city-id" className="text-xs font-medium text-slate-600">
            시·도
          </label>
          <select
            id="rtms-deals-city-id"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="mt-1 min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {DEMAND_REGIONS.map((city) => (
              <option key={city.id} value={city.id}>
                {city.fullLabel} ({city.districts.length})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void runIngest(2)}
          disabled={running}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {running ? "수집 중…" : "선택 시·도 수동 수집 (최근 2개월)"}
        </button>
        <button
          type="button"
          onClick={() => void runIngest(1)}
          disabled={running}
          className="rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
        >
          수동 테스트 (1개월)
        </button>
        <button
          type="button"
          onClick={() => void loadStats()}
          disabled={statsLoading}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          통계 새로고침
        </button>
      </div>

      {statsLoading ? (
        <p className="text-sm text-slate-500">통계 불러오는 중…</p>
      ) : stats?.ok ? (
        <div className="space-y-3">
          <ul className="list-inside list-disc text-sm text-slate-600">
            <li>
              저장 원자료 행 수: <strong>{stats.totalRows.toLocaleString()}</strong>
            </li>
            <li>
              최신 거래월: <strong>{stats.latestMonth ?? "-"}</strong>
            </li>
          </ul>
          {jobStats && jobStats.total > 0 ? (
            <div className="rounded-xl border border-teal-100 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">큐 진행률</p>
                  <p className="text-xs text-slate-500">Batch: {jobStats.batchKey ?? "-"}</p>
                </div>
                <p className="text-lg font-black text-teal-700">{jobProgress}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${jobProgress}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-5">
                <span>전체 {jobStats.total.toLocaleString()}</span>
                <span>완료 {jobStats.success.toLocaleString()}</span>
                <span>대기 {jobStats.pending.toLocaleString()}</span>
                <span>실행중 {jobStats.running.toLocaleString()}</span>
                <span>실패 {jobStats.failed.toLocaleString()}</span>
              </div>
            </div>
          ) : null}
        </div>
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
              완료:{" "}
              {lastRun.processed != null
                  ? `처리 ${lastRun.processed}개 · 성공 ${lastRun.succeeded ?? 0}개 · 실패 ${lastRun.failed ?? 0}개`
                  : lastRun.reset != null
                    ? `재시도 대기 전환 ${lastRun.reset}개`
                    : `${lastRun.period} · 저장/갱신 ${lastRun.rows ?? 0}건 · 대상 ${lastRun.districts ?? 0}곳${lastRun.cityId ? ` (${lastRun.cityId})` : ""} · 호출 ${lastRun.calls ?? 0}회`}
            </p>
          ) : (
            <p>{lastRun.error ?? "실패"}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
