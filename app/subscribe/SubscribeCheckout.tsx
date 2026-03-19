"use client";

import { useState, useCallback, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";

/** API/예외에서 나온 값을 화면에 쓸 수 있는 문자열로 변환 ([object Object] 방지) */
function toErrorString(value: unknown): string {
  if (value == null) return "구독 등록에 실패했습니다.";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    if ("message" in value) {
      const m = (value as { message: unknown }).message;
      if (typeof m === "string") return m;
      return toErrorString(m);
    }
    if ("error" in value && (value as { error: unknown }).error != null) {
      return toErrorString((value as { error: unknown }).error);
    }
    return "구독 등록에 실패했습니다.";
  }
  const s = String(value);
  return s === "[object Object]" ? "구독 등록에 실패했습니다." : s;
}

declare global {
  interface Window {
    Bootpay?: {
      requestSubscription: (params: {
        application_id: string;
        pg?: string;
        method: string;
        order_name: string;
        subscription_id: string;
        price?: number;
        redirect_url?: string;
        user?: { username?: string; phone?: string; email?: string };
        extra?: { open_type?: string };
      }) => Promise<{ billing_key?: string; receipt_id?: string; data?: { billing_key?: string; receipt_id?: string } }>;
    };
  }
}

export default function SubscribeCheckout({
  applicationId,
  userEmail,
  amountCents = 9900,
  redirectReceiptId,
  redirectBillingKey,
  redirectEvent,
  redirectStatus,
}: {
  applicationId: string;
  userEmail?: string;
  amountCents?: number;
  redirectReceiptId?: string | null;
  redirectBillingKey?: string | null;
  redirectEvent?: string | null;
  redirectStatus?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootpayReady, setBootpayReady] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 스크립트 onLoad가 클라이언트 네비게이션 시 안 불릴 수 있음 → 이미 로드됐거나 나중에 로드되면 감지
  useEffect(() => {
    const ready = () => {
      if (typeof window === "undefined") return false;
      const Bootpay = window.Bootpay ?? (window as unknown as { bootpay?: typeof window.Bootpay }).bootpay;
      if (Bootpay && typeof Bootpay === "object" && "requestSubscription" in Bootpay) {
        setBootpayReady(true);
        return true;
      }
      return false;
    };
    if (ready()) return;
    const t = setInterval(() => {
      if (ready()) clearInterval(t);
    }, 400);
    const timeout = setTimeout(() => clearInterval(t), 12000);
    return () => {
      clearInterval(t);
      clearTimeout(timeout);
    };
  }, []);

  // redirect 복귀 시: receipt_id로 구독 등록 후 홈으로 (event 또는 status로 성공 여부 판단)
  useEffect(() => {
    if (!redirectReceiptId) return;
    const eventOk = redirectEvent === "done" || redirectEvent === "issued" || redirectEvent === "11";
    const statusOk = redirectStatus === "11" || redirectStatus === "42"; // 빌링키 발급 완료/성공
    if (!eventOk && !statusOk) return;
    setLoading(true);
    setError(null);
    const body: { receipt_id: string; billing_key?: string } = { receipt_id: redirectReceiptId };
    if (redirectBillingKey?.trim()) body.billing_key = redirectBillingKey.trim();
    fetch("/api/subscribe/register-with-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const text = await res.text();
        let json: { error?: string; message?: string } = {};
        try {
          json = text ? JSON.parse(text) : {};
        } catch {
          json = {};
        }
        return { ok: res.ok, json, text };
      })
      .then(({ ok, json, text }) => {
        if (ok) {
          router.replace("/?subscribed=1");
          router.refresh();
        } else {
          const msg = json?.error ?? json?.message ?? (text?.slice(0, 300) || "구독 등록에 실패했습니다.");
          setError(toErrorString(msg));
        }
      })
      .catch((err) => {
        console.error("[Subscribe] register-with-receipt failed:", err);
        setError("구독 등록 중 오류가 발생했습니다. 네트워크를 확인하거나 잠시 후 다시 시도해 주세요.");
      })
      .finally(() => setLoading(false));
  }, [redirectReceiptId, redirectBillingKey, redirectEvent, redirectStatus, router]);

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
        price: amountCents,
        redirect_url: redirectUrl,
        extra: { open_type: "redirect" },
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
        setError(toErrorString(json?.error ?? json?.message ?? "구독 등록에 실패했습니다."));
        setLoading(false);
        return;
      }

      router.push("/?subscribed=1");
      router.refresh();
    } catch (err: unknown) {
      if (err !== undefined) console.error("[Bootpay] 결제 오류:", err);
      const msg = toErrorString(err);
      const cancelled = /cancel|취소|닫기|closed/i.test(msg);
      if (!cancelled) {
        setError(msg || "결제 중 오류가 발생했습니다. 브라우저 콘솔(F12)에서 자세한 내용을 확인할 수 있습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId, userEmail, amountCents, router]);

  return (
    <>
      <Script
        src="https://js.bootpay.co.kr/bootpay-5.2.0.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (!window.Bootpay) return;
          // SDK 내부 초기화 완료 대기 후 버튼 활성화 (결제 시작 대기 상태 오류 완화)
          setTimeout(() => setBootpayReady(true), 400);
        }}
      />
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ul className="mb-4 space-y-2 text-sm text-slate-600">
          <li>• A급 현장 목록</li>
          <li>• 지역별 단가</li>
          <li>• 평균 계약 금액</li>
        </ul>

        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p className="font-medium text-slate-700">결제 전 안내</p>
          <ul className="mt-2 space-y-1">
            <li>· 본 상품은 정기구독 상품이며, 해지하지 않으면 결제 주기마다 자동으로 갱신됩니다.</li>
            <li>· 구독 해지는 마이페이지에서 언제든지 신청할 수 있으며, 해지 시 다음 결제일부터 적용됩니다.</li>
            <li>· 서비스 특성상 결제 후 즉시 이용이 개시된 디지털 서비스는 단순 변심 환불이 제한될 수 있습니다.</li>
            <li>· 입찰·리포트·거래 관련 정보는 참고용이며, 회사는 특정 결과를 보장하지 않습니다.</li>
          </ul>
          <p className="mt-2">
            <Link href="/subscribe/terms" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline hover:text-amber-700">
              유료구독 약관 전문 보기
            </Link>
          </p>
        </div>

        <label className="mb-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm text-slate-700">
            <strong>유료구독 약관</strong> 및 위 결제 안내에 동의합니다. (동의하지 않으면 구독 결제를 진행할 수 없습니다.)
          </span>
        </label>

        {error != null && error !== "" && (() => {
          const msg = typeof error === "string" ? error : toErrorString(error);
          const text = msg === "[object Object]" ? "구독 등록에 실패했습니다." : msg;
          return (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{text}</p>
          );
        })()}
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading || !bootpayReady || !agreedToTerms}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 font-medium text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {loading ? "처리 중…" : `구독하기 (월 ${amountCents.toLocaleString("ko-KR")}원)`}
        </button>
        {!agreedToTerms && !loading && (
          <p className="mt-2 text-center text-xs text-amber-600">약관에 동의해 주세요.</p>
        )}
        {agreedToTerms && !bootpayReady && !loading && (
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
