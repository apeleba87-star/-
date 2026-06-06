"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEMAND_RTMS_BACKFILL_BATCHES,
  DEMAND_RTMS_BACKFILL_CITY_STEP_COUNT,
  DEMAND_RTMS_BACKFILL_EXCLUDED,
  type DemandRtmsBackfillBatch,
} from "@/lib/demand/rtms-backfill-batches";
import { DEMAND_RTMS_MONTHS_BACK_BACKFILL } from "@/lib/demand/rtms-ingest";

const DONE_STORAGE_KEY = "demand-rtms-backfill-done-v1";
const PROD_FETCH_TIMEOUT_MIN = 5;
const LOCAL_FETCH_TIMEOUT_MIN = 15;

function localFetchTimeoutMinFromHostname(hostname: string): number {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
    ? LOCAL_FETCH_TIMEOUT_MIN
    : PROD_FETCH_TIMEOUT_MIN;
}

type RunResult = {
  ok: boolean;
  inserted?: number;
  updated?: number;
  period?: string;
  months?: number;
  districts?: number;
  calls?: number;
  cityId?: string;
  error?: string;
  needsKey?: boolean;
};

function loadDoneSteps(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DONE_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveDoneSteps(done: Set<string>) {
  localStorage.setItem(DONE_STORAGE_KEY, JSON.stringify([...done]));
}

export default function DemandRtmsBackfillPanel() {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const [fetchTimeoutMin, setFetchTimeoutMin] = useState(PROD_FETCH_TIMEOUT_MIN);
  const [lastRun, setLastRun] = useState<{ batch: DemandRtmsBackfillBatch; result: RunResult } | null>(
    null
  );
  const fetchTimeoutLabel = `${fetchTimeoutMin}분`;

  useEffect(() => {
    setFetchTimeoutMin(localFetchTimeoutMinFromHostname(window.location.hostname));
    setDoneIds(loadDoneSteps());
  }, []);

  const runBatch = useCallback(async (batch: DemandRtmsBackfillBatch) => {
    setRunningId(batch.id);
    setLastRun(null);
    const controller = new AbortController();
    const timeoutMs = fetchTimeoutMin * 60 * 1000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch("/api/admin/ingest-demand-rtms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthsBack: batch.monthsBack,
          ...(batch.cityId ? { cityId: batch.cityId } : {}),
          refreshNational: batch.refreshNational,
          ...(batch.nationalRefreshOnly ? { nationalRefreshOnly: true } : {}),
        }),
        signal: controller.signal,
      });
      const text = await res.text();
      let result: RunResult;
      try {
        result = JSON.parse(text) as RunResult;
      } catch {
        result = {
          ok: false,
          error: `응답 파싱 실패 (HTTP ${res.status}). ${text.slice(0, 200)}`,
        };
      }
      setLastRun({ batch, result });
      if (result.ok) {
        setDoneIds((prev) => {
          const next = new Set(prev);
          next.add(batch.id);
          saveDoneSteps(next);
          return next;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastRun({
        batch,
        result: {
          ok: false,
          error:
            msg.includes("aborted") || msg === "fetch failed"
              ? `요청 시간 초과(${fetchTimeoutLabel}). 경기·경북 등은 재시도하세요.`
              : msg,
        },
      });
    } finally {
      clearTimeout(timeoutId);
      setRunningId(null);
    }
  }, [fetchTimeoutMin, fetchTimeoutLabel]);

  const clearProgress = useCallback(() => {
    setDoneIds(new Set());
    saveDoneSteps(new Set());
  }, []);

  const cityDoneCount = DEMAND_RTMS_BACKFILL_BATCHES.filter(
    (b) => b.cityId && doneIds.has(b.id)
  ).length;

  return (
    <div className="card mt-8 space-y-4 border-2 border-amber-100 bg-amber-50/30">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">RTMS 36개월 백필 (시·도별)</h2>
        <p className="mt-2 text-sm text-slate-600">
          전국 3년 데이터를 <strong>버튼 1개 = 1회 수집</strong>으로 나눕니다. 서울은 제외하고{" "}
          <strong>{DEMAND_RTMS_BACKFILL_CITY_STEP_COUNT}개 시·도</strong> + 마지막{" "}
          <strong>전국 합산 1회</strong> = 총 {DEMAND_RTMS_BACKFILL_BATCHES.length}단계입니다.
        </p>
        <p className="mt-2 text-sm text-amber-900">
          제외: {DEMAND_RTMS_BACKFILL_EXCLUDED.label} ({DEMAND_RTMS_BACKFILL_EXCLUDED.districtCount}
          구) — {DEMAND_RTMS_BACKFILL_EXCLUDED.reason}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          각 시·도 버튼: 최근 {DEMAND_RTMS_MONTHS_BACK_BACKFILL}개월 ·{" "}
          {fetchTimeoutLabel} 제한 · 완료 체크는 이 브라우저에만 저장됩니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <span>
          시·도 진행: <strong>{cityDoneCount}</strong> / {DEMAND_RTMS_BACKFILL_CITY_STEP_COUNT}
        </span>
        <button
          type="button"
          onClick={clearProgress}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          완료 표시 초기화
        </button>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {DEMAND_RTMS_BACKFILL_BATCHES.map((batch) => {
          const isDone = doneIds.has(batch.id);
          const isRunning = runningId === batch.id;
          const isNational = batch.id === "national-refresh";
          const cityBatchesDone =
            cityDoneCount >= DEMAND_RTMS_BACKFILL_CITY_STEP_COUNT;
          const disabled =
            runningId != null ||
            (isNational && !cityBatchesDone);

          return (
            <li key={batch.id}>
              <button
                type="button"
                onClick={() => void runBatch(batch)}
                disabled={disabled}
                title={
                  isNational && !cityBatchesDone
                    ? "16개 시·도 백필을 먼저 완료하세요"
                    : batch.note
                }
                className={`flex w-full flex-col items-start rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:opacity-50 ${
                  isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : isNational
                      ? "border-violet-200 bg-violet-50/80 hover:bg-violet-100/80"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="font-semibold">
                  {isDone ? "✓ " : ""}
                  {batch.step}. {batch.label}
                </span>
                <span className="mt-0.5 text-xs text-slate-500">
                  {batch.nationalRefreshOnly
                    ? `API 없음 · ${batch.monthsBack}개월 national 합산`
                    : `${batch.districtCount}구 · ${batch.monthsBack}개월`}
                </span>
                {isRunning ? (
                  <span className="mt-1 text-xs font-medium text-teal-700">
                    수집 중 (최대 {fetchTimeoutLabel})…
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      {lastRun ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            lastRun.result.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
          }`}
        >
          <p className="font-medium">
            {lastRun.batch.step}. {lastRun.batch.label}
          </p>
          {lastRun.result.ok ? (
            <p className="mt-1">
              완료 · {lastRun.result.period} · 저장 {lastRun.result.inserted ?? 0}건 ·{" "}
              {lastRun.result.districts ?? 0}곳 · API {lastRun.result.calls ?? 0}회
            </p>
          ) : (
            <p className="mt-1">{lastRun.result.error ?? "실패"}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
