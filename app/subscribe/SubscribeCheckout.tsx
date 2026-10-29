"use client";

import { useState, useCallback, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

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
  const [agreedMonthlyBilling, setAgreedMonthlyBilling] = useState(false);
  const canPay = agreedToTerms && agreedMonthlyBilling;

  // PG redirect 복귀 시 페이지가 새로 열리며 체크박스가 초기화됨 → 이미 결제 전에 동의한 상태로 표시
  useEffect(() => {
    if (!redirectReceiptId) return;
    const cameFromPayment =
      redirectEvent === "done" ||
      redirectEvent === "issued" ||
      redirectEvent === "11" ||
      redirectEvent === "1" ||
      redirectEvent === "confirm" ||
      redirectStatus === "11" ||
      redirectStatus === "42" ||
      redirectStatus === "1";
    if (cameFromPayment) {
      setAgreedToTerms(true);
      setAgreedMonthlyBilling(true);
    }
  }, [redirectReceiptId, redirectEvent, redirectStatus]);

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
    // 부트페이: done/issued, 숫자 status 1(결제완료)·11·42(빌링키) 등 조합 가능
    const eventOk =
      redirectEvent === "done" ||
      redirectEvent === "issued" ||
      redirectEvent === "11" ||
      redirectEvent === "1" ||
      redirectEvent === "confirm";
    const statusOk =
      redirectStatus === "11" ||
      redirectStatus === "42" ||
      redirectStatus === "1";
    if (!eventOk && !statusOk) return;
    setLoading(true);
    setError(null);
    const body: { receipt_id: string; billing_key?: string } = { receipt_id: redirectReceiptId };
    if (redirectBillingKey?.trim()) body.billing_key = redirectBillingKey.trim();

    const maxAttempts = 4;
    const delayMs = 3500;

    async function attemptRegister(attempt: number): Promise<void> {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/subscribe/register-with-receipt", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json: { error?: string; message?: string } = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (res.ok) {
        router.replace("/?subscribed=1");
        router.refresh();
        return;
      }

      const msg = json?.error ?? json?.message ?? (text?.slice(0, 300) || "구독 등록에 실패했습니다.");
      const retryable =
        attempt < maxAttempts - 1 &&
        (res.status >= 502 ||
          res.status === 408 ||
          /반영 중|새로고침|빌링키|timeout|일시/i.test(String(msg)));

      if (retryable) {
        await new Promise((r) => setTimeout(r, delayMs));
        return attemptRegister(attempt + 1);
      }
      setError(toErrorString(msg));
    }

    void attemptRegister(0)
      .catch((err) => {
        console.error("[Subscribe] register-with-receipt failed:", err);
        setError("구독 등록 중 오류가 발생했습니다. 네트워크를 확인하거나 잠시 후 다시 시도해 주세요.");
      })
      .finally(() => setLoading(false));
  }, [redirectReceiptId, redirectBillingKey, redirectEvent, redirectStatus, router]);

  const handleSubscribe = useCallback(async () => {
    if (!agreedToTerms || !agreedMonthlyBilling) {
      setError("결제 전 안내와 매달 자동결제·전체 동의에 모두 체크해 주세요.");
      return;
    }
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

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/subscribe/register", {
        method: "POST",
        headers,
        credentials: "include",
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
  }, [agreedToTerms, agreedMonthlyBilling, applicationId, userEmail, amountCents, router]);

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

        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          <p className="font-semibold text-amber-950">결제 전 필수 안내 (꼭 읽어 주세요)</p>
          <ul className="mt-2 list-none space-y-1.5">
            <li>
              · <strong>매달 자동 결제</strong>되는 정기구독입니다. 해지하지 않으면 매월{" "}
              {amountCents.toLocaleString("ko-KR")}원이 등록 카드로 청구됩니다.
            </li>
            <li>
              · <strong>환불되지 않습니다.</strong> 결제 즉시 이용이 시작되며, 단순 변심·이용 중단·중도 해지만으로는
              이미 결제된 금액을 돌려드리지 않습니다.
            </li>
            <li>
              · <strong>해지(중지)해도 그 달은 이용됩니다.</strong> 이미 결제한 이용 기간이 끝날 때까지 서비스는
              유지되고, <strong>다음 결제일부터</strong> 자동결제가 중단됩니다. 일할 환불은 없습니다.
            </li>
            <li>· 해지는 마이페이지·구독 페이지에서 직접 신청할 수 있습니다.</li>
            <li>· 입찰·리포트·거래 관련 정보는 참고용이며, 회사는 특정 결과를 보장하지 않습니다.</li>
            <li>· 결제 오류·중복 결제 등 회사 귀책으로 판단되는 경우에만 별도 안내합니다.</li>
          </ul>
          <p className="mt-2">
            <Link
              href="/subscribe/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-amber-700 underline hover:text-amber-900"
            >
              유료구독 약관 전문 보기
            </Link>
          </p>
        </div>

        <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm leading-snug text-slate-800">
              <Link
                href="/subscribe/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-amber-700 underline"
              >
                유료구독 약관
              </Link>
              과 위 <strong>결제 전 필수 안내</strong>(매달 자동결제·환불 불가·해지 시 당월 이용 후 종료)를 모두
              확인했습니다.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreedMonthlyBilling}
              onChange={(e) => setAgreedMonthlyBilling(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm leading-snug text-slate-800">
              <strong>매달 자동 결제</strong>되며, 해지하지 않으면 계속 청구되는 점과 환불·해지 조건을 포함한{" "}
              <strong>위 모든 상황에 동의</strong>합니다. (체크하지 않으면 결제할 수 없습니다.)
            </span>
          </label>
        </div>

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
          disabled={loading || !bootpayReady || !canPay}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 font-medium text-white shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {loading ? "처리 중…" : `구독하기 (월 ${amountCents.toLocaleString("ko-KR")}원)`}
        </button>
        {!canPay && !loading && (
          <p className="mt-2 text-center text-xs font-medium text-amber-700">
            위 두 항목에 모두 체크해야 결제를 진행할 수 있습니다.
          </p>
        )}
        {canPay && !bootpayReady && !loading && (
          <p className="mt-2 text-center text-xs text-slate-500">결제 창을 불러오는 중…</p>
        )}
      </div>
      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-slate-500 underline hover:text-slate-700">
          홈으로
        </Link>
      </p>
    </>
  );
}
