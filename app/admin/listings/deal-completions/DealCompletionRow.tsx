"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveDealCompletion, rejectDealCompletion } from "./actions";

type Props = {
  incidentId: string;
  listingId: string;
  listingTitle: string;
  reporterDisplay: string;
  createdAt: string;
};

export default function DealCompletionRow({
  incidentId,
  listingId,
  listingTitle,
  reporterDisplay,
  createdAt,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (!confirm("이 거래 완료 신고를 승인하고 글을 마감하시겠습니까?")) return;
    setError(null);
    setLoading("approve");
    const result = await approveDealCompletion(incidentId);
    setLoading(null);
    if (result.ok) router.refresh();
    else setError(result.error ?? "승인 처리에 실패했습니다.");
  }

  async function handleReject() {
    if (!confirm("이 거래 완료 신고를 거절하시겠습니까? 사용자는 다시 신고할 수 있습니다.")) return;
    setError(null);
    setLoading("reject");
    const result = await rejectDealCompletion(incidentId);
    setLoading(null);
    if (result.ok) router.refresh();
    else setError(result.error ?? "거절 처리에 실패했습니다.");
  }

  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3 text-slate-600">
        {new Date(createdAt).toLocaleString("ko-KR")}
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/listings/${listingId}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {listingTitle || "(제목 없음)"}
        </Link>
      </td>
      <td className="px-4 py-3 text-slate-600">{reporterDisplay}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={!!loading}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading === "approve" ? "처리 중…" : "승인 (마감)"}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={!!loading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading === "reject" ? "처리 중…" : "거절"}
          </button>
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}
