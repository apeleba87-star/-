"use client";

import { useState } from "react";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

export default function GenerateContentButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [force, setForce] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    setResult(null);
    try {
      const url = `/api/admin/generate-content?type=daily${force ? "&force=true" : ""}`;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const msg = data.message ?? "생성 완료";
        const snapErr = data.snapshot_error;
        setResult({
          ok: true,
          message: snapErr ? `${msg} 스냅샷 오류: ${snapErr}` : msg,
        });
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
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          className="rounded border-slate-300"
        />
        재생성 (이미 있으면 덮어쓰기)
      </label>
      <Button onClick={handleGenerate} disabled={loading}>
        {loading ? "생성 중…" : "지금 일간 리포트 생성"}
      </Button>
      {result && (
        <p className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </div>
  );
}
