"use client";

import { useState } from "react";
import { rescindNoShowReport } from "@/app/jobs/[id]/actions";

type Props = {
  reportId: string;
};

export default function RescindNoShowButton({ reportId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRescind() {
    if (!confirm("이 노쇼 신고를 취소(철회)하시겠습니까? 구직자 지원 상태가 다시 '확정'으로 복구됩니다.")) return;
    setError(null);
    setLoading(true);
    const result = await rescindNoShowReport(reportId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "철회 처리에 실패했습니다.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleRescind}
        disabled={loading}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? "처리 중…" : "노쇼 취소(철회)"}
      </button>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
