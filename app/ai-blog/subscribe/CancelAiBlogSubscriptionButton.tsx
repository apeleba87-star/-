"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelAiBlogSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm("AI 블로그 구독을 해지할까요? 다음 결제일까지는 계속 이용할 수 있습니다.")) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai-blog/subscribe/cancel", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json?.error ?? "해지에 실패했습니다.");
        return;
      }
      setMessage(json?.message ?? "해지되었습니다.");
      router.refresh();
    } catch {
      setMessage("해지 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
      >
        {loading ? "처리 중…" : "구독 해지"}
      </button>
      {message && <p className="mt-2 text-xs text-emerald-800">{message}</p>}
    </div>
  );
}
