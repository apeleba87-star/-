"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";

type ResultState = {
  ok: boolean;
  message?: string;
  error?: string;
  topics?: string[];
};

export default function GenerateMoveRtmsSeoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [force, setForce] = useState(false);
  const [draft, setDraft] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [limit, setLimit] = useState(5);
  const [result, setResult] = useState<ResultState | null>(null);

  async function onRun() {
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        monthsBack: "2",
      });
      if (force) params.set("force", "true");
      if (draft) params.set("draft", "true");
      if (dryRun) params.set("dryRun", "true");
      const res = await fetch(`/api/admin/generate-move-rtms-seo?${params.toString()}`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setResult({
          ok: true,
          message: data.message ?? "이사검색 SEO 글 생성 완료",
          topics: Array.isArray(data.topics) ? data.topics : undefined,
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
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            className="rounded border-slate-300"
          />
          재생성
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={draft}
            onChange={(e) => setDraft(e.target.checked)}
            className="rounded border-slate-300"
          />
          초안으로만 생성
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded border-slate-300"
          />
          테스트만
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          발행 수
          <input
            type="number"
            min={1}
            max={12}
            value={limit}
            onChange={(e) => setLimit(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
            className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </label>
        <Button onClick={onRun} disabled={loading}>
          {loading ? "생성 중..." : "이사검색 SEO 글 생성"}
        </Button>
      </div>
      {result && (
        <div className={`rounded-lg p-3 text-sm ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          <p>{result.ok ? result.message : result.error}</p>
          {result.topics?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {result.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
