"use client";

import { useState, useCallback, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Camera, Check, FilePenLine, Loader2, RefreshCw, Sparkles } from "lucide-react";
import PaidTermsDisclosure from "@/components/subscribe/PaidTermsDisclosure";
import { createClient } from "@/lib/supabase";

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
      }) => Promise<{
        billing_key?: string;
        receipt_id?: string;
        data?: { billing_key?: string; receipt_id?: string };
      }>;
    };
  }
}

type Props = {
  applicationId: string;
  userEmail?: string;
  normalAmountCents: number;
  promoEnabled: boolean;
  promoAmountCents: number;
  monthOptions: number[];
  redirectReceiptId?: string | null;
  redirectBillingKey?: string | null;
  redirectEvent?: string | null;
  redirectStatus?: string | null;
  redirectPromoMonths?: number | null;
  /** 구독 완료 후 돌아갈 경로 (AI 작성 화면 등) */
  returnNext?: string | null;
};

function safeAiBlogNext(path: string | null | undefined): string {
  if (!path || typeof path !== "string") return "/ai-blog?subscribed=1";
  const p = path.trim();
  if (!p.startsWith("/ai-blog") || p.startsWith("//")) return "/ai-blog?subscribed=1";
  const sep = p.includes("?") ? "&" : "?";
  return `${p}${sep}subscribed=1`;
}

export default function AiBlogSubscribeCheckout({
  applicationId,
  userEmail,
  normalAmountCents,
  promoEnabled,
  promoAmountCents,
  monthOptions,
  redirectReceiptId,
  redirectBillingKey,
  redirectEvent,
  redirectStatus,
  redirectPromoMonths,
  returnNext,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootpayReady, setBootpayReady] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedMonthlyBilling, setAgreedMonthlyBilling] = useState(false);
  const defaultMonths = monthOptions[0] ?? 1;
  const [selectedMonths, setSelectedMonths] = useState<number>(
    redirectPromoMonths && monthOptions.includes(redirectPromoMonths)
      ? redirectPromoMonths
      : defaultMonths,
  );

  const chargeCents = promoEnabled ? promoAmountCents : normalAmountCents;
  const canPay = agreedToTerms && agreedMonthlyBilling;

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
    // 결제창 리다이렉트 복귀: 결제 직전 이미 동의한 상태로 등록 진행
    if (cameFromPayment) {
      setAgreedToTerms(true);
      setAgreedMonthlyBilling(true);
    }
  }, [redirectReceiptId, redirectEvent, redirectStatus]);

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

  useEffect(() => {
    if (!redirectReceiptId) return;
    const eventOk =
      redirectEvent === "done" ||
      redirectEvent === "issued" ||
      redirectEvent === "11" ||
      redirectEvent === "1" ||
      redirectEvent === "confirm";
    const statusOk =
      redirectStatus === "11" || redirectStatus === "42" || redirectStatus === "1";
    if (!eventOk && !statusOk) return;
    setLoading(true);
    setError(null);
    const body: { receipt_id: string; billing_key?: string; promo_months?: number } = {
      receipt_id: redirectReceiptId,
      promo_months: redirectPromoMonths && monthOptions.includes(redirectPromoMonths)
        ? redirectPromoMonths
        : selectedMonths,
    };
    if (redirectBillingKey?.trim()) body.billing_key = redirectBillingKey.trim();

    const maxAttempts = 4;
    const delayMs = 3500;

    async function attemptRegister(attempt: number): Promise<void> {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/ai-blog/subscribe/register-with-receipt", {
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
        router.replace(safeAiBlogNext(returnNext));
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
        console.error("[AI Blog Subscribe] register-with-receipt failed:", err);
        setError("구독 등록 중 오류가 발생했습니다. 네트워크를 확인하거나 잠시 후 다시 시도해 주세요.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redirect 1회 처리
  }, [redirectReceiptId, redirectBillingKey, redirectEvent, redirectStatus, redirectPromoMonths, returnNext, router]);

  const handleSubscribe = useCallback(async () => {
    if (!agreedToTerms || !agreedMonthlyBilling) {
      setError("아래 두 항목에 모두 체크해 주세요.");
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
      const subscriptionId = `ai_blog_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const nextQs =
        returnNext && returnNext.startsWith("/ai-blog")
          ? `&next=${encodeURIComponent(returnNext)}`
          : "";
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/ai-blog/subscribe?promo_months=${selectedMonths}${nextQs}`
          : "";
      const orderName = promoEnabled
        ? `AI 블로그 ${selectedMonths}개월 특가 후 월 구독`
        : "AI 블로그 월 구독";

      const data = await Bootpay.requestSubscription({
        application_id: applicationId,
        pg: "nicepay",
        method: "card_rebill",
        order_name: orderName,
        subscription_id: subscriptionId,
        price: chargeCents,
        redirect_url: redirectUrl,
        extra: { open_type: "redirect" },
        user: userEmail ? { email: userEmail } : undefined,
      });

      const billingKey = data?.data?.billing_key ?? data?.billing_key;
      const receiptId = data?.data?.receipt_id ?? data?.receipt_id;

      if (!receiptId) {
        setError("결제 영수증을 받지 못했습니다. 결제창에서 카드 등록을 완료해 주세요.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/ai-blog/subscribe/register", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          billing_key: billingKey || undefined,
          receipt_id: receiptId,
          promo_months: promoEnabled ? selectedMonths : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(toErrorString(json?.error ?? json?.message ?? "구독 등록에 실패했습니다."));
        setLoading(false);
        return;
      }

      router.push(safeAiBlogNext(returnNext));
      router.refresh();
    } catch (err: unknown) {
      if (err !== undefined) console.error("[Bootpay AI Blog] 결제 오류:", err);
      const msg = toErrorString(err);
      const cancelled = /cancel|취소|닫기|closed/i.test(msg);
      if (!cancelled) {
        setError(msg || "결제 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    agreedToTerms,
    agreedMonthlyBilling,
    applicationId,
    userEmail,
    chargeCents,
    promoEnabled,
    selectedMonths,
    returnNext,
    router,
  ]);

  const benefits = [
    { Icon: Camera, title: "현장 사진으로 초안", desc: "전·후 사진만 맞추면 글 뼈대가 잡힙니다" },
    { Icon: FilePenLine, title: "문단 다시쓰기", desc: "마음에 안 드는 부분만 골라 고칩니다" },
    { Icon: RefreshCw, title: "네이버로 옮기기", desc: "완성된 글을 그대로 이전할 수 있습니다" },
  ];

  return (
    <>
      <Script
        src="https://js.bootpay.co.kr/bootpay-5.2.0.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (!window.Bootpay) return;
          setTimeout(() => setBootpayReady(true), 400);
        }}
      />

      <ul className="space-y-3">
        {benefits.map(({ Icon, title, desc }) => (
          <li key={title} className="flex gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </li>
        ))}
      </ul>

      {promoEnabled && monthOptions.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">특가 기간 선택</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {monthOptions.map((m) => {
              const selected = selectedMonths === m;
              const recommended = m === Math.max(...monthOptions);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonths(m)}
                  disabled={loading}
                  className={`relative rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-emerald-500 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-200"
                      : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30"
                  }`}
                >
                  {recommended ? (
                    <span className="absolute -top-2 left-3 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                      추천
                    </span>
                  ) : null}
                  {selected ? (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                  <p className="text-base font-bold text-slate-900">
                    {promoAmountCents.toLocaleString("ko-KR")}원
                    <span className="ml-1 text-sm font-semibold text-slate-600">· {m}개월</span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {m}개월간 특가 → 이후 월 {normalAmountCents.toLocaleString("ko-KR")}원
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <PaidTermsDisclosure open={termsOpen} onOpenChange={setTermsOpen} accent="emerald">
          <p className="mb-2 font-semibold text-slate-800">결제 전 필수 안내</p>
          <ul className="list-none space-y-1.5">
            <li>
              · <strong>매달 자동 결제</strong>되는 정기구독입니다. 해지하지 않으면 매월{" "}
              {normalAmountCents.toLocaleString("ko-KR")}원이 등록 카드로 청구됩니다.
            </li>
            {promoEnabled && (
              <li>
                · 선택하신 {selectedMonths}개월은 {promoAmountCents.toLocaleString("ko-KR")}원/월이며, 이후에는 월{" "}
                {normalAmountCents.toLocaleString("ko-KR")}원이 자동 청구됩니다.
              </li>
            )}
            <li>
              · <strong>환불되지 않습니다.</strong> 결제 즉시 이용이 시작되며, 단순 변심·이용 중단·중도 해지만으로는
              이미 결제된 금액을 돌려드리지 않습니다.
            </li>
            <li>
              · <strong>해지(중지)해도 그 달은 이용됩니다.</strong> 해지해도 이미 결제한 이용 기간이 끝날 때까지
              서비스는 유지되고, <strong>다음 결제일부터</strong> 자동결제가 중단됩니다. 일할 환불은 없습니다.
            </li>
            <li>· 해지는 AI 블로그 구독 페이지·마이페이지에서 직접 신청할 수 있습니다.</li>
            <li>· 결제 오류·중복 결제 등 회사 귀책으로 판단되는 경우에만 별도 안내합니다.</li>
          </ul>
        </PaidTermsDisclosure>

        <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm leading-snug text-slate-800">
              <button
                type="button"
                className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2"
                onClick={(e) => {
                  e.preventDefault();
                  setTermsOpen(true);
                }}
              >
                유료구독 약관
              </button>
              과 결제 안내(매달 자동결제·환불 불가·해지 시 당월 이용 후 종료)를 확인했습니다.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreedMonthlyBilling}
              onChange={(e) => setAgreedMonthlyBilling(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm leading-snug text-slate-800">
              <strong>매달 자동 결제</strong>되며, 해지하지 않으면 계속 청구되는 점과 환불·해지 조건을 포함한{" "}
              <strong>위 모든 상황에 동의</strong>합니다.
            </span>
          </label>
        </div>

        {error != null && error !== "" && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{toErrorString(error)}</p>
        )}

        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading || !bootpayReady || !canPay}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-[0_12px_28px_-10px_rgba(15,23,42,0.55)] transition hover:bg-slate-800 hover:shadow-[0_16px_32px_-10px_rgba(15,23,42,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/20 to-teal-400/0 opacity-0 transition group-hover:opacity-100"
          />
          {loading ? <Loader2 className="relative h-5 w-5 animate-spin" /> : <Sparkles className="relative h-5 w-5 text-emerald-300" />}
          <span className="relative">
            {loading
              ? "처리 중…"
              : promoEnabled
                ? `${chargeCents.toLocaleString("ko-KR")}원으로 바로 시작`
                : `월 ${chargeCents.toLocaleString("ko-KR")}원으로 시작`}
          </span>
        </button>
        {!canPay && !loading && (
          <p className="text-center text-xs font-medium text-slate-500">
            두 항목에 모두 체크하면 시작할 수 있습니다.
          </p>
        )}
        {canPay && !bootpayReady && !loading && (
          <p className="text-center text-xs text-slate-500">결제 창을 불러오는 중…</p>
        )}
        {canPay && bootpayReady && !loading && (
          <p className="text-center text-xs text-emerald-700">동의 완료 · 바로 결제할 수 있습니다</p>
        )}
      </div>
    </>
  );
}
