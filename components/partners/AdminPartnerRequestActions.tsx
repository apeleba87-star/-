"use client";

import { useState } from "react";
import { approvePartnerChangeRequest, rejectPartnerChangeRequest } from "@/app/admin/partners/actions";

type Props = {
  requestId: string;
};

export default function AdminPartnerRequestActions({ requestId }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onApprove() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await approvePartnerChangeRequest({ request_id: requestId });
      if (!res.ok) throw new Error(res.error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "승인 처리 실패");
      setLoading(false);
    }
  }

  async function onReject() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await rejectPartnerChangeRequest({
        request_id: requestId,
        reason: reason || null,
      });
      if (!res.ok) throw new Error(res.error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "반려 처리 실패");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="반려 사유(선택)"
        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
        disabled={loading}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={loading}
          className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:bg-emerald-300"
        >
          승인
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={loading}
          className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white disabled:bg-rose-300"
        >
          반려
        </button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
