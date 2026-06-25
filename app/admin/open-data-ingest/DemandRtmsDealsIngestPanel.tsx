"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMAND_RTMS_UNIT_COUNT } from "@/lib/demand/lawd-codes.generated";
import { DEMAND_REGIONS } from "@/lib/demand/regions";

type Stats =
  | { ok: true; totalRows: number; latestMonth: string | null }
  | { ok: false; error?: string };

type RunResult = {
  ok: boolean;
  housingTypes?: string[];
  period?: string;
  months?: number;
  districts?: number;
  calls?: number;
  rows?: number;
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

  return (
    <div className="card mt-8 space-y-4 border-teal-100 bg-teal-50/30">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">이사검색 RTMS 실거래 원자료 수집</h2>
        <p className="mt-2 text-sm text-slate-600">
          아파트·빌라/연립·오피스텔·단독/다가구 매매·전월세 원자료를 최근 3개월 기준으로 수집해{" "}
          <code className="rounded bg-white px-1 text-xs">demand_rtms_deals</code>에 저장합니다.
          이 데이터가 <code className="text-xs">/move</code> 예산 검색 결과에 사용됩니다.
        </p>
        <p className="mt-2 text-sm text-amber-800">
          전국 {DEMAND_RTMS_UNIT_COUNT}곳을 한 번에 돌리면 오래 걸립니다. 서울, 경기, 인천처럼 시·도별로 나눠 실행하세요.
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
            <option value="">전국 ({DEMAND_RTMS_UNIT_COUNT}곳)</option>
            {DEMAND_REGIONS.map((city) => (
              <option key={city.id} value={city.id}>
                {city.fullLabel} ({city.districts.length})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void runIngest(3)}
          disabled={running}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {running ? "수집 중…" : "실거래 원자료 수집 (최근 3개월)"}
        </button>
        <button
          type="button"
          onClick={() => void runIngest(1)}
          disabled={running}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          테스트 (1개월)
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
        <ul className="list-inside list-disc text-sm text-slate-600">
          <li>
            저장 원자료 행 수: <strong>{stats.totalRows.toLocaleString()}</strong>
          </li>
          <li>
            최신 거래월: <strong>{stats.latestMonth ?? "-"}</strong>
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
              완료: {lastRun.period} · 저장/갱신 {lastRun.rows ?? 0}건 · 대상 {lastRun.districts ?? 0}곳
              {lastRun.cityId ? ` (${lastRun.cityId})` : ""} · 호출 {lastRun.calls ?? 0}회
            </p>
          ) : (
            <p>{lastRun.error ?? "실패"}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
