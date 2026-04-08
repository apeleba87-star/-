"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";

export default function GenerateAwardReportButton() {
  const [loading, setLoading] = useState(false);
  const [force, setForce] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const router = useRouter();

  async function onRun() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/generate-award-report${force ? "?force=true" : ""}`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, message: data.message ?? "낙찰 리포트 생성 완료" });
        router.refresh();
      } else {
        setResult({ ok: false, error: data.error ?? "실패" });
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "요청 실패" });
    }
    setLoading(false);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          className="rounded border-slate-300"
        />
        재생성 (이미 있으면 덮어쓰기)
      </label>
      <Button onClick={onRun} disabled={loading}>
        {loading ? "생성 중…" : "낙찰 리포트 생성"}
      </Button>
      {result && (
        <p className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </div>
  );
}

