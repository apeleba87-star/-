"use client";

import { useState, useTransition } from "react";
import { runJobWageDailyReportBackfill30Days, runJobWageDailyReportManual } from "./actions";

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
      <div className="mt-3 flex flex-wrap gap-2">
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
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          지금 어제(KST) 기준 집계·저장
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("KST 기준 어제부터 30일치(총 30개 날짜)를 순서대로 집계·저장합니다. 수십 초 걸릴 수 있습니다. 진행할까요?")) {
              return;
            }
            setMsg(null);
            startTransition(async () => {
              const r = await runJobWageDailyReportBackfill30Days();
              if (!r.ok) {
                setMsg(r.error ?? "실패");
                return;
              }
              const parts = [`30일 일괄 완료: 성공 ${r.succeeded}/${r.total}건`];
              if (r.failures.length > 0) {
                parts.push(
                  `실패 ${r.failures.length}건:\n${r.failures.map((f) => `${f.date}: ${f.error}`).join("\n")}`
                );
              }
              setMsg(parts.join("\n\n"));
            });
          }}
          className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
        >
          최근 30일치 일괄 발행
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
