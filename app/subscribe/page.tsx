import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import { hasSubscriptionAccess } from "@/lib/subscription-access";
import { getSubscriptionFirstChargeAmount, getSubscriptionPromoAmountCents } from "@/lib/app-settings";
import SubscribeCheckout from "./SubscribeCheckout";
import SubscribeStatus from "./SubscribeStatus";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ receipt_id?: string; billing_key?: string; event?: string; status?: string }> };
// Bootpay redirect 시 receipt_id, (선택) billing_key, event(done/issued/11) 또는 status(11/42) 전달

export default async function SubscribePage({ searchParams }: Props) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/subscribe");
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, next_billing_at, amount_cents, promo_remaining_months")
    .eq("user_id", user.id)
    .maybeSingle();

  const subRow = sub as {
    status?: string;
    next_billing_at?: string | null;
    amount_cents?: number;
    promo_remaining_months?: number | null;
  } | null;
  const nextBillingAt = subRow?.next_billing_at ?? null;
  const todayKst = getKstDateString();
  const hasAccess = hasSubscriptionAccess(subRow, todayKst);
  const isCancelled = subRow?.status === "cancelled";
  const isPastDue = subRow?.status === "past_due";

  if (hasAccess) {
    const promoAmount = await getSubscriptionPromoAmountCents(supabase);
    const nextAmount =
      subRow?.promo_remaining_months != null && subRow.promo_remaining_months > 0 && promoAmount > 0
        ? promoAmount
        : (subRow?.amount_cents ?? 9900);
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900">프리미엄 구독</h1>
        <p className="mt-2 text-slate-600">
          {isCancelled ? "취소 예정입니다. 아래 날짜까지 이용 가능합니다." : "현재 구독 중입니다. 취소 시 다음 결제일까지 이용 가능합니다."}
        </p>
        <SubscribeStatus
          nextBillingAt={nextBillingAt}
          nextBillingAmountCents={nextAmount}
          promoRemainingMonths={subRow?.promo_remaining_months ?? null}
          normalAmountCents={subRow?.amount_cents ?? 9900}
          showCancelButton={!isCancelled}
        />
      </div>
    );
  }

  const appId = process.env.NEXT_PUBLIC_BOOTPAY_APPLICATION_ID;
  if (!appId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-slate-600">결제 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.</p>
      </div>
    );
  }

  const params = await searchParams;
  const receiptId = params?.receipt_id ?? null;
  const billingKeyFromRedirect = params?.billing_key ?? null;
  const event = params?.event ?? null;
  const status = params?.status ?? null;

  const amountCents = await getSubscriptionFirstChargeAmount(supabase);
  const amountFormatted = amountCents.toLocaleString("ko-KR");

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">프리미엄 구독</h1>
      <p className="mt-2 text-slate-600">월 {amountFormatted}원으로 데이터 인사이트를 이용하실 수 있습니다.</p>
      {isPastDue && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">결제에 실패했습니다.</p>
          <p className="mt-1 text-amber-700">아래에서 결제 수단을 다시 등록하시면 구독이 재개됩니다.</p>
        </div>
      )}
      <SubscribeCheckout
        applicationId={appId}
        userEmail={user.email ?? undefined}
        amountCents={amountCents}
        redirectReceiptId={receiptId}
        redirectBillingKey={billingKeyFromRedirect}
        redirectEvent={event}
        redirectStatus={status}
      />
    </div>
  );
}
