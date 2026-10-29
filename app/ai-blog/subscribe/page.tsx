import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { isBootpayConfigured } from "@/lib/bootpay-server";
import {
  getAiBlogAmountCents,
  getAiBlogPromoConfig,
  isAiBlogPromoActive,
} from "@/lib/ai-blog/billing-settings";
import AiBlogSubscribeCheckout from "./AiBlogSubscribeCheckout";
import CancelAiBlogSubscriptionButton from "./CancelAiBlogSubscriptionButton";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function AiBlogSubscribePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ai-blog/subscribe");

  const applicationId = process.env.NEXT_PUBLIC_BOOTPAY_APPLICATION_ID ?? "";
  const bootpayOk = isBootpayConfigured() && Boolean(applicationId);

  const [amountCents, promo] = await Promise.all([
    getAiBlogAmountCents(supabase),
    getAiBlogPromoConfig(supabase),
  ]);
  const promoActive = isAiBlogPromoActive(promo);

  const { data: sub } = await supabase
    .from("ai_blog_subscriptions")
    .select("status, next_billing_at, amount_cents, promo_remaining_months, promo_months")
    .eq("user_id", user.id)
    .maybeSingle();

  const redirectReceiptId = first(sp.receipt_id);
  const redirectBillingKey = first(sp.billing_key);
  const redirectEvent = first(sp.event);
  const redirectStatus = first(sp.status);
  const promoMonthsRaw = first(sp.promo_months);
  const redirectPromoMonths = promoMonthsRaw ? Number(promoMonthsRaw) : null;
  const returnNextRaw = first(sp.next);
  const returnNext =
    returnNextRaw && returnNextRaw.startsWith("/ai-blog") && !returnNextRaw.startsWith("//")
      ? returnNextRaw
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="text-sm font-medium text-sky-600">AI 블로그</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">유료 구독</h1>
      <p className="mt-2 text-sm text-slate-600">
        무료 체험(3일 · 블로그 3개) 이후에는 구독이 필요합니다. 특가 기간을 고른 뒤 카드 등록하면, 이후 정상 금액이
        <strong> 매달 자동 결제</strong>됩니다. 결제 전 안내와 동의 체크를 모두 확인한 뒤에만 결제를 진행할 수
        있습니다.
      </p>

      {sub && (sub as { status: string }).status === "active" && (
        <div className="mt-6 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            이미 활성 구독이 있습니다. 다음 결제일: {(sub as { next_billing_at: string }).next_billing_at}
            {(sub as { promo_remaining_months?: number | null }).promo_remaining_months != null &&
              (sub as { promo_remaining_months: number }).promo_remaining_months > 0 && (
                <> · 프로모 잔여 {(sub as { promo_remaining_months: number }).promo_remaining_months}개월</>
              )}
          </p>
          <CancelAiBlogSubscriptionButton />
        </div>
      )}

      {!bootpayOk ? (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          결제 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.
        </div>
      ) : (
        <AiBlogSubscribeCheckout
          applicationId={applicationId}
          userEmail={user.email ?? undefined}
          normalAmountCents={amountCents}
          promoEnabled={promoActive}
          promoAmountCents={promo.amount_cents}
          monthOptions={promo.month_options}
          redirectReceiptId={redirectReceiptId}
          redirectBillingKey={redirectBillingKey}
          redirectEvent={redirectEvent}
          redirectStatus={redirectStatus}
          redirectPromoMonths={
            redirectPromoMonths != null && Number.isFinite(redirectPromoMonths)
              ? redirectPromoMonths
              : null
          }
          returnNext={returnNext}
        />
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        <Link href="/subscribe/terms" className="underline hover:text-slate-600">
          유료구독 약관
        </Link>
      </p>
    </div>
  );
}
