"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatScsbidInqryRangeKstLabel,
  SCSBID_AWARD_ADMIN_BATCH_LOOKBACK_MINUTES,
} from "@/lib/g2b/scsbid-ingest-window";

type Stats =
  | { ok: true; totalCount: number; scsbidListSttusServcCount: number }
  | { ok: false; error?: string };

type RunResult = {
  ok: boolean;
  scsbid?: {
    pages: number;
    rowsWritten: number;
    totalCount: number;
    lastResultCode?: string;
    /** API에 넣은 개찰일시 조회 시작·끝 (KST YYYYMMDDHHmm) */
    inqryBgnDt?: string;
    inqryEndDt?: string;
    error?: string;
  };
  error?: string;
};

export default function ScsbidAwardIngestPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/ingest-scsbid-award-raw", { method: "GET" });
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

  const runIngest = useCallback(
    async (query: string) => {
      setRunning(true);
      setLastRun(null);
      try {
        const res = await fetch(`/api/admin/ingest-scsbid-award-raw${query}`, { method: "POST" });
        const j = (await res.json()) as RunResult;
        setLastRun(j);
        await loadStats();
      } catch (e) {
        setLastRun({ ok: false, error: e instanceof Error ? e.message : String(e) });
      } finally {
        setRunning(false);
      }
    },
    [loadStats]
  );

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">나라장터 낙찰정보 (용역)</h2>
        <p className="mt-2 text-sm text-slate-600">
          공공데이터포털 <code className="rounded bg-slate-100 px-1 text-xs">ScsbidInfoService</code>의{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">getScsbidListSttusServc</code>로 용역 낙찰
          건을 가져와 <code className="rounded bg-slate-100 px-1 text-xs">tender_award_raw</code>에
          저장합니다. 공고명·상세에 대해 입찰공고와 동일한 키워드 규칙으로{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">categories</code>·
          <code className="rounded bg-slate-100 px-1 text-xs">is_clean_related</code>를 채웁니다.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          자동 수집: Vercel Cron <code className="text-xs">/api/cron/fetch-scsbid-award-raw</code> (
          <code className="text-xs">DATA_GO_KR_SCSBID_SERVICE_KEY</code>·크론 시크릿 필요. 입찰공고 키와 별도). 실행
          시점(KST) 기준 개찰일시 조회 슬라이딩 구간은{" "}
          <code className="text-xs">SCSBID_AWARD_CRON_LOOKBACK_MINUTES</code>로 조정합니다(기본 약 4시간 10분, 이
          환경변수 상한은 14일). 아래 「24시간치」는 관리자 전용으로 개찰일시 기준 최근 24시간 구간을 한 번에 조회합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => void runIngest("?maxRows=2500&pageSize=100")}
          disabled={running}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? "수집 중…" : "지금 수집 실행"}
        </button>
        <button
          type="button"
          onClick={() =>
            void runIngest(
              `?lookbackMinutes=${SCSBID_AWARD_ADMIN_BATCH_LOOKBACK_MINUTES}&maxRows=20000&pageSize=100`
            )
          }
          disabled={running}
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
        >
          {running ? "수집 중…" : "24시간치 한번에 수집"}
        </button>
        <button
          type="button"
          onClick={() => void loadStats()}
          disabled={statsLoading}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          통계 새로고침
        </button>
        <p className="w-full text-xs text-slate-500">
          24시간치도 한 번에 최대 약 2만 건(내부 페이지 상한)까지이며, 그보다 많으면 같은 버튼을 반복해 이어 받을 수
          있습니다.
        </p>
      </div>

      <div className="text-sm text-slate-600">
        {statsLoading ? (
          <p>통계 불러오는 중…</p>
        ) : stats?.ok === true ? (
          <ul className="list-inside list-disc space-y-1">
            <li>
              원천 테이블 전체: <strong>{stats.totalCount.toLocaleString()}</strong>건
            </li>
            <li>
              Scsbid 용역 낙찰 목록: <strong>{stats.scsbidListSttusServcCount.toLocaleString()}</strong>건
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
          {lastRun.ok && lastRun.scsbid ? (
            <div className="space-y-1">
              <p className="font-medium">수집 완료</p>
              {lastRun.scsbid.inqryBgnDt && lastRun.scsbid.inqryEndDt ? (
                <p className="text-xs opacity-90">
                  이번 요청 조회 구간:{" "}
                  {formatScsbidInqryRangeKstLabel(lastRun.scsbid.inqryBgnDt, lastRun.scsbid.inqryEndDt)}
                </p>
              ) : null}
              <p>
                처리 페이지: {lastRun.scsbid.pages}, 저장(또는 갱신) 행:{" "}
                <strong>{lastRun.scsbid.rowsWritten.toLocaleString()}</strong>
              </p>
              <p className="text-xs opacity-90">
                API totalCount: {lastRun.scsbid.totalCount.toLocaleString()}, resultCode:{" "}
                {lastRun.scsbid.lastResultCode ?? "—"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {lastRun.scsbid?.inqryBgnDt && lastRun.scsbid?.inqryEndDt ? (
                <p className="text-xs opacity-90">
                  요청 조회 구간:{" "}
                  {formatScsbidInqryRangeKstLabel(lastRun.scsbid.inqryBgnDt, lastRun.scsbid.inqryEndDt)}
                </p>
              ) : null}
              <p>{lastRun.scsbid?.error ?? lastRun.error ?? "수집 실패"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
