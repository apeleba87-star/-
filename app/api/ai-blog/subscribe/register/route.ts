import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { isBootpayConfigured } from "@/lib/bootpay-server";
import {
  getAiBlogAmountCents,
  getAiBlogFirstChargeAmount,
} from "@/lib/ai-blog/billing-settings";
import { activateAiBlogPaidSubscription } from "@/lib/ai-blog/activate-paid";
import {
  assertReceiptNotUsedByOther,
  resolveVerifiedAiBlogBilling,
} from "@/lib/ai-blog/subscribe-guard";

export const runtime = "nodejs";

/**
 * AI 블로그 구독 등록 (팝업/SDK에서 billing_key+receipt_id를 받은 경우).
 * receipt_id 필수 · Bootpay 검증 · 금액 교차확인 후에만 권한 부여.
 */
export async function POST(req: Request) {
  if (!isBootpayConfigured()) {
    return NextResponse.json({ error: "결제가 설정되지 않았습니다." }, { status: 503 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { billing_key?: string; receipt_id?: string; promo_months?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const receiptId = typeof body.receipt_id === "string" ? body.receipt_id.trim() : "";
  if (!receiptId) {
    return NextResponse.json(
      { error: "결제 영수증(receipt_id)이 필요합니다. 결제를 다시 진행해 주세요." },
      { status: 400 },
    );
  }

  let service;
  try {
    service = createServiceSupabase();
  } catch {
    return NextResponse.json({ error: "서버 설정 오류로 구독을 저장할 수 없습니다." }, { status: 503 });
  }

  const promoMonths =
    body.promo_months != null && Number.isFinite(Number(body.promo_months))
      ? Math.round(Number(body.promo_months))
      : null;
  const charge = await getAiBlogFirstChargeAmount(service, promoMonths);
  const normalAmount = await getAiBlogAmountCents(service);

  const reused = await assertReceiptNotUsedByOther(service, receiptId, user.id);
  if (!reused.ok) {
    return NextResponse.json({ error: reused.error }, { status: 400 });
  }

  const verified = await resolveVerifiedAiBlogBilling({
    receiptId,
    expectedPriceCents: charge.amountCents,
    billingKeyHint: typeof body.billing_key === "string" ? body.billing_key : null,
  });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  const result = await activateAiBlogPaidSubscription(service, {
    userId: user.id,
    billingKey: verified.billingKey,
    receiptId,
    amountCents: normalAmount,
    promoMonths: charge.appliedPromo ? charge.promoMonths : 0,
    actorId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "AI 블로그 구독이 시작되었습니다.",
    first_charge_cents: charge.amountCents,
    promo_months: charge.appliedPromo ? charge.promoMonths : 0,
    next_billing_at: result.nextBillingAt,
  });
}
