"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type Props = {
  nextBillingAt: string | null;
  /** false면 취소 예정 상태(버튼 숨김) */
  showCancelButton?: boolean;
};

export default function SubscribeStatus({ nextBillingAt, showCancelButton = true }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm("구독을 취소하시겠습니까? 다음 결제일까지는 계속 이용할 수 있습니다.")) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/subscribe/cancel", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMessage(data.message ?? "구독이 취소되었습니다.");
        router.refresh();
      } else {
        setError(data?.error ?? "취소 처리에 실패했습니다.");
      }
    } catch {
      setError("요청 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  const nextDate =
    nextBillingAt &&
    (() => {
      try {
        return new Date(nextBillingAt).toLocaleDateString("ko-KR");
      } catch {
        return nextBillingAt;
      }
    })();

  return (
    <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm">
      <p className="font-medium text-emerald-800">
        {showCancelButton ? "구독 중입니다." : "취소 예정입니다."}
      </p>
      {nextDate && (
        <p className="mt-1 text-sm text-emerald-700">
          {showCancelButton ? `다음 결제일: ${nextDate}` : `이용 가능 기간: ~${nextDate}`}
        </p>
      )}
      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {showCancelButton && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "처리 중…" : "구독 취소"}
        </button>
      )}
      <p className="mt-4 text-xs text-slate-500">
        {showCancelButton
          ? "취소 후에도 다음 결제일까지는 리포트를 이용할 수 있습니다."
          : "기간 만료 후에는 유료 콘텐츠가 잠기며, 재결제는 진행되지 않습니다."}
      </p>
      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-slate-500 underline hover:text-slate-700">
          홈으로
        </Link>
      </p>
    </div>
  );
}
