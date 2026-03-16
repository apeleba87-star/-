"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reportListingDealCompleted } from "@/app/listings/[id]/actions";

type Props = { listingId: string };

export default function ReportDealCompletedButton({ listingId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("이 현장거래가 완료되었나요? 신고 후 관리자 확인을 거치면 글은 마감 처리됩니다.")) return;
    setError(null);
    setLoading(true);
    const result = await reportListingDealCompleted(listingId);
    setLoading(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? "처리 실패");
    }
  }

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-5 shadow-lg">
      <p className="mb-3 text-sm text-slate-700">
        이 현장거래가 완료되었다면 신고해 주세요. 관리자 확인 후 마감 처리되어 목록에서 (마감)으로 표시됩니다.
      </p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="min-h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-emerald-600 hover:to-green-600 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50"
      >
        {loading ? "처리 중…" : "거래 완료 신고"}
      </button>
    </div>
  );
}
