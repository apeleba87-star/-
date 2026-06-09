"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { archiveExpiredRadarAdSlots } from "@/app/admin/radar-ads/actions";

export default function RadarAdArchiveExpiredButton({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (count <= 0) return null;

  async function onArchive() {
    if (!confirm(`기간이 지났는데 게재 상태인 슬롯 ${count}건을 중지(보관) 처리할까요?`)) return;
    setLoading(true);
    setMessage(null);
    const res = await archiveExpiredRadarAdSlots();
    setLoading(false);
    if (res.ok) {
      setMessage(`${res.updatedCount ?? 0}건을 중지로 변경했습니다.`);
      router.refresh();
    } else {
      setMessage(res.error ?? "처리 실패");
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void onArchive()}
        className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-100 disabled:opacity-50"
      >
        {loading ? "처리 중…" : `만료 슬롯 ${count}건 → 중지 보관`}
      </button>
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
