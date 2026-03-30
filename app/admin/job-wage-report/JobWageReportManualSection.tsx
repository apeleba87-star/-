"use client";

import { useState, useTransition } from "react";
import { runJobWage30DayReportManual, runJobWageTodayReportManual } from "./actions";

export default function JobWageReportManualSection() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <h2 className="text-sm font-semibold text-slate-800">일당 리포트 수동 갱신</h2>
      <p className="mt-1 text-xs text-slate-600">
        <strong>30일</strong>: KST <strong>어제</strong>를 말일로 하여 그날부터 <strong>30일(포함)</strong> 구간을 집계합니다.{" "}
        <strong>당일</strong>: KST <strong>오늘</strong> 00:00~자정 직전에 생성된 포지션만 집계합니다. 두 경우 모두 저장 시 기존 일당 리포트는{" "}
        <strong>모두 지우고 이번 결과 1건만</strong> 남습니다. 서버에{" "}
        <code className="rounded bg-white px-1">SUPABASE_SERVICE_ROLE_KEY</code> 가 있어야 합니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                "KST 기준 최근 30일(어제 말일) 구간을 한 번에 집계하고, 저장된 일당 리포트를 모두 이 결과로 바꿉니다. 진행할까요?"
              )
            ) {
              return;
            }
            setMsg(null);
            startTransition(async () => {
              const r = await runJobWage30DayReportManual();
              if (r.ok) {
                setMsg(`완료: ${r.report_date ?? ""} 말일 기준 30일 리포트 저장`);
              } else {
                setMsg(r.error ?? "실패");
              }
            });
          }}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          30일 기준 리포트 생성
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                "KST 오늘 하루 동안 생성된 신규 구인 포지션만 집계하고, 저장된 일당 리포트를 모두 이 결과로 바꿉니다. 진행할까요?"
              )
            ) {
              return;
            }
            setMsg(null);
            startTransition(async () => {
              const r = await runJobWageTodayReportManual();
              if (r.ok) {
                setMsg(`완료: ${r.report_date ?? ""} 당일(KST) 리포트 저장`);
              } else {
                setMsg(r.error ?? "실패");
              }
            });
          }}
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          당일(KST) 리포트 생성
        </button>
      </div>
      {msg && (
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-sm text-slate-700">{msg}</pre>
      )}
      <p className="mt-3 text-xs text-slate-500">
        공개 페이지:{" "}
        <a href="/job-market-report" className="font-medium text-blue-600 hover:underline">
          /job-market-report
        </a>
      </p>
    </section>
  );
}
