"use client";

import { useCallback, useEffect, useState } from "react";

type Stats =
  | {
      ok: true;
      dailyRows: number;
      monthlyRows: number;
      searchadMonthlyRows?: number;
      searchadDistinctMonths?: number;
      searchAdCredentials?: { configured: boolean; customerId: string | null };
    }
  | { ok: false; error?: string };

type RunResult = {
  ok: boolean;
  datalab?: {
    ok: boolean;
    inserted?: number;
    startDate?: string;
    endDate?: string;
    source?: string;
    matched?: string[];
    error?: string;
  };
  searchAd?: {
    ok: boolean;
    inserted?: number;
    yyyymm?: string;
    regions?: number;
    phrases?: number;
    skipped?: boolean;
    note?: string;
    error?: string;
  };
  error?: string;
};

type SearchAdTestResult = {
  configured?: boolean;
  ok: boolean;
  customerId?: string | null;
  sample?: { keyword: string; total: number | null; belowTen: boolean };
  error?: string;
  status?: number;
};

export default function DemandKeywordIngestPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningSearchAd, setRunningSearchAd] = useState(false);
  const [testingSearchAd, setTestingSearchAd] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [lastSearchAd, setLastSearchAd] = useState<SearchAdTestResult | null>(null);

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

  const runSearchAdOnly = useCallback(async () => {
    setRunningSearchAd(true);
    setLastSearchAd(null);
    try {
      const res = await fetch("/api/admin/ingest-demand-searchad", { method: "POST" });
      const j = (await res.json()) as RunResult["searchAd"] & { ok: boolean; error?: string };
      if (j.ok) {
        setLastRun({ ok: true, searchAd: j });
        setLastSearchAd({ ok: true });
      } else {
        setLastSearchAd({ ok: false, error: j.error ?? "수집 실패" });
      }
      await loadStats();
    } catch (e) {
      setLastSearchAd({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunningSearchAd(false);
    }
  }, [loadStats]);

  const testSearchAd = useCallback(async () => {
    setTestingSearchAd(true);
    setLastSearchAd(null);
    try {
      const res = await fetch("/api/admin/test-searchad");
      const j = (await res.json()) as SearchAdTestResult;
      setLastSearchAd(j);
    } catch (e) {
      setLastSearchAd({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setTestingSearchAd(false);
    }
  }, []);

  const searchAdConfigured = stats?.ok ? stats.searchAdCredentials?.configured : false;

  return (
    <div className="card mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">입주수요 검색 지표 수집</h2>
        <p className="mt-2 text-sm text-slate-600">
          <strong>데이터랩</strong> → 일·월 상대지수 →{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">demand_keyword_daily</code>
          <br />
          <strong>검색광고 검색량</strong> → 매월 1회 스냅샷(그때의 최근 30일 롤링) →{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">demand_keyword_monthly</code>
          · 월마다 1행씩 누적 → 1년 차트
        </p>
      </div>

      <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3 text-sm text-slate-700">
        <p className="font-semibold text-violet-900">검색광고 API (SA API 사용 관리)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-600">
          <li>
            <code>NAVER_SEARCHAD_API_KEY</code> = 액세스 라이선스
          </li>
          <li>
            <code>NAVER_SEARCHAD_SECRET_KEY</code> = 비밀키 (UTF-8 문자열, base64 디코드 하지 않음)
          </li>
          <li>
            <code>NAVER_SEARCHAD_CUSTOMER_ID</code> = 고객 ID
          </li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          설정 후 dev 서버 재시작 · Vercel에도 동일 3개 변수 추가
        </p>
        <p className="mt-1 text-xs text-amber-800">
          구별 문구: <strong>강북구입주청소</strong> · <strong>강북구포장이사</strong> (쌍으로 동일 구
          접두). DB·API는 붙여쓰기, 허브 UI는 「강북구 입주청소」처럼 표시.
        </p>
        <p className="mt-1 text-xs text-slate-600">
          검색광고 API는 과거 12개월을 한 번에 주지 않습니다.{" "}
          <strong>매월 1일 KST 01:00</strong> cron{" "}
          <code className="text-xs">/api/cron/ingest-demand-searchad</code> 또는 「검색광고만 수집」으로
          그달 스냅샷을 쌓으면 1년 검색량 그래프가 채워집니다. 「전체 수집」은 데이터랩(지수)만
          갱신합니다.
        </p>
        <p className="mt-1 text-xs font-medium text-slate-700">
          키 상태:{" "}
          {statsLoading
            ? "…"
            : searchAdConfigured
              ? `설정됨 (고객 ID ${stats?.ok ? stats.searchAdCredentials?.customerId ?? "" : ""})`
              : "미설정 — 검색량은 더미"}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => void runIngest()}
          disabled={running || runningSearchAd}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? "수집 중…" : "데이터랩 수집 (지수)"}
        </button>
        <button
          type="button"
          onClick={() => void runSearchAdOnly()}
          disabled={running || runningSearchAd || !searchAdConfigured}
          className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
        >
          {runningSearchAd ? "검색광고 수집 중…" : "검색광고만 수집"}
        </button>
        <button
          type="button"
          onClick={() => void testSearchAd()}
          disabled={testingSearchAd || !searchAdConfigured}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
        >
          {testingSearchAd ? "테스트 중…" : "검색광고 연결 테스트"}
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
            월별 행(전체): <strong>{stats.monthlyRows.toLocaleString()}</strong>
          </li>
          <li>
            검색광고 월 스냅샷: <strong>{(stats.searchadMonthlyRows ?? 0).toLocaleString()}</strong>행 ·
            누적 <strong>{stats.searchadDistinctMonths ?? 0}</strong>개월
          </li>
        </ul>
      ) : (
        <p className="text-sm text-red-600">{stats && "error" in stats ? stats.error : "—"}</p>
      )}

      {lastSearchAd ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            lastSearchAd.ok ? "border-violet-200 bg-violet-50" : "border-red-200 bg-red-50"
          }`}
        >
          {lastSearchAd.ok && lastSearchAd.sample ? (
            <p>
              연결 OK · 「{lastSearchAd.sample.keyword}」 월 추정 검색량{" "}
              {lastSearchAd.sample.belowTen ? "<10" : (lastSearchAd.sample.total?.toLocaleString() ?? "—")}
            </p>
          ) : lastSearchAd.ok ? (
            <p>검색광고 수집 완료</p>
          ) : (
            <p>{lastSearchAd.error ?? "실패"}</p>
          )}
        </div>
      ) : null}

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
                  ? `월 스냅샷 별도 — ${lastRun.searchAd.note ?? "ingest-demand-searchad"}`
                  : lastRun.searchAd?.ok
                    ? `OK · ${lastRun.searchAd.yyyymm} · ${lastRun.searchAd.regions ?? 0}지역 · ${lastRun.searchAd.inserted ?? 0}행`
                    : `실패 — ${lastRun.searchAd?.error ?? ""}`}
              </p>
            </div>
          ) : (
            <p>{lastRun.error ?? lastRun.datalab?.error ?? lastRun.searchAd?.error ?? "실패"}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
