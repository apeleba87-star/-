"use client";

import { useState } from "react";

export default function KnowledgeHubSeedButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function seed() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/seed-knowledge-hub", { method: "POST" });
    const json = (await res.json()) as { ok?: boolean; count?: number; error?: string };
    setLoading(false);
    setMsg(json.ok ? `${json.count}개 시드 완료` : json.error ?? "실패");
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={loading}
        onClick={() => void seed()}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? "시드 중…" : "DB 시드 실행"}
      </button>
      {msg ? <span className="text-sm text-slate-600">{msg}</span> : null}
    </div>
  );
}
