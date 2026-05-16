import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import { hasSubscriptionAccess } from "@/lib/subscription-access";
import { getSubscriptionFirstChargeAmount, getSubscriptionPromoAmountCents } from "@/lib/app-settings";
import SubscribeCheckout from "./SubscribeCheckout";
import SubscribeStatus from "./SubscribeStatus";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ receipt_id?: string; billing_key?: string; event?: string; status?: string }> };

export default async function SubscribePage({ searchParams }: Props) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          입찰·일당·마케팅 리포트는 로그인 후 무료입니다. 아래는 기존 유료 구독(결제·해지) 안내입니다.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {isCancelled ? "취소 예정입니다. 아래 날짜까지 결제 갱신이 없습니다." : "구독이 활성 상태입니다. 취소 시 다음 결제일까지 유지됩니다."}
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

  if (!isPastDue) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900">리포트 이용 안내</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          입찰·낙찰·일당·마케팅 리포트는 <strong className="text-slate-800">로그인 후 무료</strong>로 전체를 확인할 수 있습니다. 비로그인
          상태에서는 미리보기만 제공됩니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/news?section=report"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            리포트 보기
          </Link>
          <Link
            href="/tenders"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            입찰 공고
          </Link>
        </div>
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
      <h1 className="text-2xl font-bold text-slate-900">결제 재등록</h1>
      <p className="mt-2 text-slate-600">리포트는 로그인 후 무료입니다. 아래는 기존 구독 결제 실패 건 재등록입니다.</p>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">결제에 실패했습니다.</p>
        <p className="mt-1 text-amber-700">결제 수단을 다시 등록해 주세요. (월 {amountFormatted}원)</p>
      </div>
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
