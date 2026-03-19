"use client";

import { useState, useCallback, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";

declare global {
  interface Window {
    Bootpay?: {
      requestSubscription: (params: {
        application_id: string;
        pg?: string;
        method: string;
        order_name: string;
        subscription_id: string;
        redirect_url?: string;
        user?: { username?: string; phone?: string; email?: string };
      }) => Promise<{ billing_key?: string; receipt_id?: string; data?: { billing_key?: string; receipt_id?: string } }>;
    };
  }
}

export default function SubscribeCheckout({
  applicationId,
  userEmail,
  redirectReceiptId,
  redirectEvent,
  redirectStatus,
}: {
  applicationId: string;
  userEmail?: string;
  redirectReceiptId?: string | null;
  redirectEvent?: string | null;
  redirectStatus?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootpayReady, setBootpayReady] = useState(false);

  // redirect 복귀 시: receipt_id로 구독 등록 후 홈으로 (event 또는 status로 성공 여부 판단)
  useEffect(() => {
    if (!redirectReceiptId) return;
    const eventOk = redirectEvent === "done" || redirectEvent === "issued" || redirectEvent === "11";
    const statusOk = redirectStatus === "11" || redirectStatus === "42"; // 빌링키 발급 완료/성공
    if (!eventOk && !statusOk) return;
    setLoading(true);
    setError(null);
    fetch("/api/subscribe/register-with-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt_id: redirectReceiptId }),
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (ok) {
          router.replace("/?subscribed=1");
          router.refresh();
        } else {
          setError(json?.error ?? "구독 등록에 실패했습니다.");
        }
      })
      .catch(() => setError("구독 등록 중 오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, [redirectReceiptId, redirectEvent, redirectStatus, router]);

  const handleSubscribe = useCallback(async () => {
    const Bootpay = window.Bootpay ?? (window as unknown as { bootpay?: typeof window.Bootpay }).bootpay;
    if (!Bootpay?.requestSubscription) {
      setError("결제 창을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      // redirect 모드일 때 필수: http/https 포함한 redirect_url
      const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/subscribe` : "";
      const data = await Bootpay.requestSubscription({
        application_id: applicationId,
        pg: "nicepay",
        method: "card_rebill",
        order_name: "클린아이덱스 프리미엄 월 구독",
        subscription_id: subscriptionId,
        redirect_url: redirectUrl,
        user: userEmail ? { email: userEmail } : undefined,
      });

      const billingKey = data?.data?.billing_key ?? data?.billing_key;
      const receiptId = data?.data?.receipt_id ?? data?.receipt_id;

      if (!billingKey) {
        setError("빌링키를 받지 못했습니다. 결제창에서 카드 등록을 완료해 주세요.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/subscribe/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_key: billingKey, receipt_id: receiptId }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? "구독 등록에 실패했습니다.");
        setLoading(false);
        return;
      }

      router.push("/?subscribed=1");
      router.refresh();
    } catch (err: unknown) {
      const raw = err;
      const msg =
        typeof raw === "object" && raw !== null && "message" in raw
          ? String((raw as { message: unknown }).message)
          : err instanceof Error
            ? err.message
            : "결제 중 오류가 발생했습니다.";
      if (typeof raw !== "undefined") {
        console.error("[Bootpay] 결제 오류:", raw);
      }
      const cancelled = /cancel|취소|닫기|closed/i.test(msg);
      if (!cancelled) {
        setError(msg || "결제 중 오류가 발생했습니다. 브라우저 콘솔(F12)에서 자세한 내용을 확인할 수 있습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId, userEmail, router]);

  return (
    <>
      <Script
        src="https://js.bootpay.co.kr/bootpay-5.2.0.min.js"
        strategy="afterInteractive"
        onLoad={() => setBootpayReady(!!window.Bootpay)}
      />
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ul className="mb-6 space-y-2 text-sm text-slate-600">
          <li>• A급 현장 목록</li>
          <li>• 지역별 단가</li>
          <li>• 평균 계약 금액</li>
        </ul>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading || !bootpayReady}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 font-medium text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {loading ? "처리 중…" : "구독하기 (월 9,900원)"}
        </button>
        {!bootpayReady && !loading && (
          <p className="mt-2 text-center text-xs text-slate-500">결제 창을 불러오는 중…</p>
        )}
        <p className="mt-4 text-center text-xs text-slate-400">
          결제 수단 등록 후 매월 자동 결제됩니다. 해지는 구독 페이지에서 취소할 수 있습니다.
        </p>
      </div>
      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-slate-500 underline hover:text-slate-700">
          홈으로
        </Link>
      </p>
    </>
  );
}
