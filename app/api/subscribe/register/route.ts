import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { verifyReceipt, isBootpayConfigured } from "@/lib/bootpay-server";
import {
  getSubscriptionAmountCents,
  getSubscriptionFirstChargeAmount,
  getSubscriptionPromoConfig,
} from "@/lib/app-settings";

export async function POST(req: Request) {
  if (!isBootpayConfigured()) {
    return NextResponse.json({ error: "결제가 설정되지 않았습니다." }, { status: 503 });
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const normalAmount = await getSubscriptionAmountCents(supabase);
  const firstChargeAmount = await getSubscriptionFirstChargeAmount(supabase);
  const promo = await getSubscriptionPromoConfig(supabase);
  const appliedPromo =
    promo.enabled &&
    firstChargeAmount === promo.amount_cents &&
    promo.months >= 1;
  const promoRemaining = appliedPromo ? Math.max(0, promo.months - 1) : null;

  let body: { billing_key: string; receipt_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { billing_key, receipt_id } = body;
  if (!billing_key || typeof billing_key !== "string") {
    return NextResponse.json({ error: "billing_key가 필요합니다." }, { status: 400 });
  }

  // 빌링키 발급 시 받은 receipt_id로 검증 (선택)
  if (receipt_id) {
    const verified = await verifyReceipt(receipt_id);
    if (!verified || verified.status !== 1) {
      return NextResponse.json({ error: "결제 정보 검증에 실패했습니다." }, { status: 400 });
    }
  }

  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1);

  const { error: upsertError } = await supabase.from("subscriptions").upsert(
    {
      user_id: user.id,
      billing_key,
      plan: "monthly",
      amount_cents: normalAmount,
      status: "active",
      next_billing_at: nextBilling.toISOString().slice(0, 10),
      last_receipt_id: receipt_id ?? null,
      updated_at: new Date().toISOString(),
      ...(promoRemaining !== null && { promo_remaining_months: promoRemaining }),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await supabase.from("profiles").update({ subscription_plan: "paid", updated_at: new Date().toISOString() }).eq("id", user.id);

  return NextResponse.json({ ok: true, message: "구독이 시작되었습니다." });
}
