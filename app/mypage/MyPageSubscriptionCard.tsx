"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  status: "active" | "cancelled" | "past_due" | null;
  nextBillingAt: string | null;
};

export default function MyPageSubscriptionCard({ status, nextBillingAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const nextDate =
    nextBillingAt &&
    (() => {
      try {
        return new Date(nextBillingAt).toLocaleDateString("ko-KR");
      } catch {
        return nextBillingAt;
      }
    })();

  async function handleCancel() {
    if (!confirm("구독을 취소하시겠습니까? 다음 결제일까지는 계속 이용할 수 있습니다.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe/cancel", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const hasAccess = status === "active" || (status === "cancelled" && nextBillingAt);
  const isCancelled = status === "cancelled";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">프리미엄 구독</h2>

      {!status && (
        <>
          <p className="text-sm text-slate-600">구독 중이 아닙니다. 리포트를 더 보려면 구독해 주세요.</p>
          <Link
            href="/subscribe"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            구독하기
          </Link>
        </>
      )}

      {status === "past_due" && (
        <>
          <p className="text-sm text-amber-800">결제에 실패했습니다. 아래에서 다시 결제해 주세요.</p>
          <Link
            href="/subscribe"
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            다시 결제하기
          </Link>
        </>
      )}

      {hasAccess && (
        <>
          <p className="font-medium text-slate-800">
            {isCancelled ? "취소 예정입니다." : "구독 중입니다."}
          </p>
          {nextDate && (
            <p className="mt-1 text-sm text-slate-600">
              {isCancelled ? `이용 가능 기간: ~${nextDate}` : `다음 결제일: ${nextDate}`}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/subscribe"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              구독 관리
            </Link>
            {!isCancelled && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "처리 중…" : "구독 취소"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
