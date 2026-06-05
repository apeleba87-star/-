"use client";

import { useCallback, useEffect, useState } from "react";

type Stats =
  | {
      ok: true;
      dailyRows: number;
      monthlyRows: number;
      districtDailyRows?: number;
      datalabDistrictRows?: number;
      datalabConfigured?: boolean;
      searchadMonthlyRows?: number;
      searchadDistinctMonths?: number;
      searchadBasketPhrases?: number;
      searchadBasketPhraseTarget?: number;
      searchadRollingRows?: number;
      searchadRollingLatestDate?: string | null;
      rollingMigrationReady?: boolean;
      rollingMigrationError?: string | null;
      phraseUniqueMigrationReady?: boolean;
      phraseUniqueMigrationError?: string | null;
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
  searchAdDaily?: {
    ok: boolean;
    inserted?: number;
    snapshotDate?: string;
    regions?: number;
    phrases?: number;
    mode?: string;
    skipped?: boolean;
    note?: string;
    error?: string;
    needsKey?: boolean;
  };
  searchAdMonthly?: {
    ok: boolean;
    skipped?: boolean;
    note?: string;
    error?: string;
  };
  /** @deprecated searchAdMonthly — 월간 별도 버튼 결과 */
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
    try {
      const res = await fetch("/api/admin/ingest-demand-keywords", {
        method: "POST",
        signal: controller.signal,
      });
      const text = await res.text();
      let j: RunResult;
      try {
        j = JSON.parse(text) as RunResult;
      } catch {
        setLastRun({
          ok: false,
          error: `서버 응답 파싱 실패 (HTTP ${res.status}). ${text.slice(0, 200)}`,
        });
        return;
      }
      const allOk = Boolean(j.datalab?.ok) && Boolean(j.searchAdDaily?.ok);
      setLastRun({
        ...j,
        ok: j.ok ?? allOk,
        error:
          allOk
            ? undefined
            : j.searchAdDaily?.error ??
              j.datalab?.error ??
              j.error ??
              (!res.ok ? `HTTP ${res.status}` : undefined),
      });
      await loadStats();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastRun({
        ok: false,
        error:
          msg === "fetch failed" || msg.includes("aborted")
            ? "요청이 끊겼습니다. 구별 수집은 2~5분 걸립니다. Vercel(또는 dev) Functions 로그·터미널을 확인하고, 최신 코드 배포 후 다시 시도하세요."
            : msg,
      });
    } finally {
      clearTimeout(timeoutId);
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
  const datalabConfigured = stats?.ok ? Boolean(stats.datalabConfigured) : false;
  const lastDatalabTrendOnly =
    lastRun?.datalab &&
    "source" in lastRun.datalab &&
    lastRun.datalab.source === "naver_trend_datapoints";

  return (
    <div className="card mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">입주수요 검색 지표 수집</h2>
        <p className="mt-2 text-sm text-slate-600">
          <strong>데이터랩</strong> → 일·월 검색지수 →{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">demand_keyword_daily</code>{" "}
          (source=datalab)
          <br />
          <strong>검색광고 롤링 30일</strong> → 매일 허브 Basket(전국+서울) → 같은 테이블{" "}
          (source=searchad_rolling_30d) · 카드·30일 검색량 차트
          <br />
          <strong>검색광고 월별 아카이브</strong> → 매월 1회(+구별 DB 축적) →{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">demand_keyword_monthly</code> · 1년
          검색량 차트
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
        <p className="font-semibold">데이터랩 API (구별 검색지수)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>
            <code>NAVER_CLIENT_ID</code> · <code>NAVER_CLIENT_SECRET</code> — developers.naver.com 앱
            (데이터랩 검색어트렌드)
          </li>
          <li>
            키 없으면 마케팅 트렌드 DB의 <strong>전국 입주청소</strong>만 복사 → 25구 비교 차트가
            모두 같은 선
          </li>
        </ul>
        <p className="mt-2 text-xs font-medium">
          데이터랩 키:{" "}
          {statsLoading
            ? "…"
            : stats?.ok
              ? stats.datalabConfigured
                ? "설정됨"
                : "이 서버 미설정 (Vercel prod에는 있을 수 있음 — .env.local 복사 또는 prod에서 수집)"
              : "—"}
          {stats?.ok ? (
            <>
              {" "}
              · 구별 일별 행{" "}
              <strong>{(stats.datalabDistrictRows ?? 0).toLocaleString()}</strong>
              {(stats.datalabDistrictRows ?? 0) === 0 ? " (구별 지수 없음)" : ""}
            </>
          ) : null}
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
          전국 Basket 8문구(포장 4 + 입주 4) · 구별은 레거시 2문구(강북구입주청소 등). 허브 UI는
          「강북구 입주청소」처럼 표시.
        </p>
        <p className="mt-1 text-xs text-slate-600">
          롤링 30일은 <strong>매일</strong> cron{" "}
          <code className="text-xs">/api/cron/ingest-demand-keywords</code> 또는 「데이터랩 수집」과
          함께 실행됩니다. 월별 아카이브는 <strong>매월 1일 KST 01:00</strong>{" "}
          <code className="text-xs">/api/cron/ingest-demand-searchad</code> 또는 「검색광고만
          수집」으로 누적합니다.
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
          disabled={running || runningSearchAd || !datalabConfigured}
          title={
            datalabConfigured
              ? "전국·서울·25구 입주청소·포장이사 검색지수 (DataLab API)"
              : ".env.local 또는 Vercel에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 추가 후 dev 재시작"
          }
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? "수집 중 (2~5분)…" : "일일 수집 (지수 + 롤링 검색량)"}
        </button>
        <button
          type="button"
          onClick={() => void runSearchAdOnly()}
          disabled={running || runningSearchAd || !searchAdConfigured}
          className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
        >
          {runningSearchAd ? "검색광고 수집 중…" : "월별 아카이브만 수집"}
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

      {stats?.ok && stats.rollingMigrationReady === false ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <strong>롤링 30일 컬럼 없음.</strong> Supabase SQL Editor에서{" "}
          <code className="text-xs">154_demand_keyword_daily_rolling_volume.sql</code> migration을
          적용하세요.
          {stats.rollingMigrationError ? (
            <>
              <br />
              <span className="text-xs">{stats.rollingMigrationError}</span>
            </>
          ) : null}
        </p>
      ) : null}
      {stats?.ok && stats.phraseUniqueMigrationReady === false ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <strong>phrase unique 제약 없음 (Basket upsert 충돌).</strong> SQL Editor에서{" "}
          <code className="text-xs">155_demand_keyword_daily_phrase_unique.sql</code> migration을
          적용하세요.
          {stats.phraseUniqueMigrationError ? (
            <>
              <br />
              <span className="text-xs">{stats.phraseUniqueMigrationError}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {statsLoading ? (
        <p className="text-sm text-slate-500">통계 불러오는 중…</p>
      ) : stats?.ok ? (
        <ul className="list-inside list-disc text-sm text-slate-600">
          <li>
            일별 지수 행: <strong>{stats.dailyRows.toLocaleString()}</strong>
            {(stats.datalabDistrictRows ?? 0) === 0 && stats.dailyRows > 0 ? (
              <span className="text-amber-800"> — 전국/트렌드만 있을 수 있음</span>
            ) : null}
          </li>
          <li>
            구별 일별 행: <strong>{(stats.districtDailyRows ?? 0).toLocaleString()}</strong>
            {" "}
            (데이터랩 source: <strong>{(stats.datalabDistrictRows ?? 0).toLocaleString()}</strong>)
          </li>
          <li>
            월별 행(전체): <strong>{stats.monthlyRows.toLocaleString()}</strong>
          </li>
          <li>
            검색광고 롤링 30일: <strong>{(stats.searchadRollingRows ?? 0).toLocaleString()}</strong>행
            {stats.searchadRollingLatestDate ? (
              <>
                {" "}
                · 최신 <strong>{stats.searchadRollingLatestDate}</strong>
              </>
            ) : null}
          </li>
          <li>
            검색광고 월 스냅샷: <strong>{(stats.searchadMonthlyRows ?? 0).toLocaleString()}</strong>행 ·
            누적 <strong>{stats.searchadDistinctMonths ?? 0}</strong>개월 · 전국 Basket{" "}
            <strong>
              {stats.searchadBasketPhrases ?? 0}/{stats.searchadBasketPhraseTarget ?? 8}
            </strong>
            문구
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

      {!datalabConfigured && !statsLoading ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <strong>이 서버(보통 localhost)에는 데이터랩 키가 없습니다.</strong> Vercel에{" "}
          <code className="text-xs">NAVER_CLIENT_ID</code> / <code className="text-xs">SECRET</code> 이
          있어도 <strong>배포 사이트 환경</strong>에만 적용됩니다. 구별 지수 수집은 (1) Vercel과 동일
          값을 <code className="text-xs">.env.local</code>에 넣고 dev 재시작 후 여기서 실행, 또는 (2){" "}
          <strong>프로덕션 URL</strong> 관리자에서 「데이터랩 수집」을 실행하세요. 검색광고 키만으로는
          구별 지수가 수집되지 않습니다.
        </p>
      ) : null}

      {lastRun ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            lastRun.ok && !lastDatalabTrendOnly
              ? "border-emerald-200 bg-emerald-50"
              : lastRun.datalab?.ok && !lastRun.searchAdDaily?.ok
                ? "border-amber-300 bg-amber-50"
                : lastRun.ok && lastDatalabTrendOnly
                  ? "border-amber-300 bg-amber-50"
                  : "border-red-200 bg-red-50"
          }`}
        >
          {lastRun.ok ? (
            <div className="space-y-1">
              <p>
                DataLab:{" "}
                {lastDatalabTrendOnly ? (
                  <strong className="text-amber-900">전국만 반영됨 (구별 아님)</strong>
                ) : lastRun.datalab?.ok ? (
                  "구별·전국 수집 OK"
                ) : (
                  "실패"
                )}{" "}
                ·{" "}
                {lastDatalabTrendOnly
                  ? `트렌드 DB 복사 · ${(lastRun.datalab as { matched?: string[] }).matched?.join(", ") ?? ""}`
                  : `${(lastRun.datalab as { startDate?: string }).startDate ?? ""}~${(lastRun.datalab as { endDate?: string }).endDate ?? ""}`}{" "}
                · {lastRun.datalab && "inserted" in lastRun.datalab ? lastRun.datalab.inserted : 0}행
              </p>
              {"warning" in (lastRun.datalab ?? {}) && (lastRun.datalab as { warning?: string }).warning ? (
                <p className="text-amber-900">
                  {(lastRun.datalab as { warning?: string }).warning}
                </p>
              ) : null}
              <p>
                검색광고 롤링:{" "}
                {lastRun.searchAdDaily?.skipped
                  ? (lastRun.searchAdDaily.note ?? "건너뜀")
                  : lastRun.searchAdDaily?.ok
                    ? `OK · ${lastRun.searchAdDaily.snapshotDate ?? ""} · ${lastRun.searchAdDaily.regions ?? 0}지역 · ${lastRun.searchAdDaily.inserted ?? 0}행`
                    : `실패 — ${lastRun.searchAdDaily?.error ?? ""}`}
              </p>
              {lastRun.searchAdMonthly?.note ? (
                <p className="text-xs text-slate-600">월별: {lastRun.searchAdMonthly.note}</p>
              ) : null}
            </div>
          ) : (
            <p>
              {lastRun.error ??
                lastRun.datalab?.error ??
                lastRun.searchAdDaily?.error ??
                lastRun.searchAd?.error ??
                "실패"}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
