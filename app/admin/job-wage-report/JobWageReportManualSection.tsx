"use client";

import { useState, useTransition } from "react";
import { runJobWageDailyReportManual } from "./actions";

export default function JobWageReportManualSection() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <h2 className="text-sm font-semibold text-slate-800">일당 스냅샷 수동 갱신</h2>
      <p className="mt-1 text-xs text-slate-600">
        <strong>KST 어제</strong> 0시~24시에 생성된 구인 포지션만 집계합니다. Cron은 쓰지 않을 때 여기서 실행하세요. 서버에{" "}
        <code className="rounded bg-white px-1">SUPABASE_SERVICE_ROLE_KEY</code> 가 있어야 합니다.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          startTransition(async () => {
            const r = await runJobWageDailyReportManual();
            if (r.ok) {
              setMsg(`완료: ${r.report_date ?? ""} 스냅샷 저장`);
            } else {
              setMsg(r.error ?? "실패");
            }
          });
        }}
        className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        지금 어제(KST) 기준 집계·저장
      </button>
      {msg && <p className="mt-2 text-sm text-slate-700">{msg}</p>}
      <p className="mt-3 text-xs text-slate-500">
        공개 페이지:{" "}
        <a href="/job-market-report" className="font-medium text-blue-600 hover:underline">
          /job-market-report
        </a>
      </p>
    </section>
  );
}
