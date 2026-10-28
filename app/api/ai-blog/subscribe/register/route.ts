import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { verifyReceipt, isBootpayConfigured, isBootpayReceiptSuccessStatus } from "@/lib/bootpay-server";
import {
  getAiBlogAmountCents,
  getAiBlogFirstChargeAmount,
} from "@/lib/ai-blog/billing-settings";
import { activateAiBlogPaidSubscription } from "@/lib/ai-blog/activate-paid";

export const runtime = "nodejs";

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

  let body: { billing_key: string; receipt_id?: string; promo_months?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { billing_key, receipt_id, promo_months: rawMonths } = body;
  if (!billing_key || typeof billing_key !== "string") {
    return NextResponse.json({ error: "billing_key가 필요합니다." }, { status: 400 });
  }

  let service;
  try {
    service = createServiceSupabase();
  } catch {
    return NextResponse.json({ error: "서버 설정 오류로 구독을 저장할 수 없습니다." }, { status: 503 });
  }

  const promoMonths =
    rawMonths != null && Number.isFinite(Number(rawMonths)) ? Math.round(Number(rawMonths)) : null;
  const charge = await getAiBlogFirstChargeAmount(service, promoMonths);
  const normalAmount = await getAiBlogAmountCents(service);

  if (receipt_id) {
    const verified = await verifyReceipt(receipt_id);
    if (!verified || !isBootpayReceiptSuccessStatus(verified.status)) {
      return NextResponse.json({ error: "결제 정보 검증에 실패했습니다." }, { status: 400 });
    }
  }

  const result = await activateAiBlogPaidSubscription(service, {
    userId: user.id,
    billingKey: billing_key,
    receiptId: receipt_id,
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
