import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import {
  lookupBillingKeyByReceiptWithRetry,
  isBootpayConfigured,
  verifyReceipt,
} from "@/lib/bootpay-server";
import {
  getSubscriptionAmountCents,
  getSubscriptionFirstChargeAmount,
  getSubscriptionPromoConfig,
} from "@/lib/app-settings";

/** redirect 복귀 시 receipt_id(필수)와 선택적으로 billing_key로 구독 등록. 저장은 service role로 해서 세션/RLS 이슈 방지 */
export async function POST(req: Request) {
  try {
    if (!isBootpayConfigured()) {
      return NextResponse.json({ error: "결제가 설정되지 않았습니다." }, { status: 503 });
    }

    const authSupabase = await createServerSupabase();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let body: { receipt_id: string; billing_key?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const { receipt_id, billing_key: billingKeyFromClient } = body;
    if (!receipt_id || typeof receipt_id !== "string") {
      return NextResponse.json({ error: "receipt_id가 필요합니다." }, { status: 400 });
    }

    let billing_key: string;

    if (billingKeyFromClient && typeof billingKeyFromClient === "string" && billingKeyFromClient.trim()) {
      const verified = await verifyReceipt(receipt_id);
      if (!verified || (verified.status !== 1 && verified.status !== 11 && verified.status !== 42)) {
        return NextResponse.json(
          { error: "결제 정보 검증에 실패했습니다. 영수증 상태를 확인해 주세요." },
          { status: 400 }
        );
      }
      billing_key = billingKeyFromClient.trim();
    } else {
      const result = await lookupBillingKeyByReceiptWithRetry(receipt_id);
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      billing_key = result.billing_key;
    }
    let serviceSupabase;
    try {
      serviceSupabase = createServiceSupabase();
    } catch {
      return NextResponse.json(
        { error: "서버 설정 오류로 구독을 저장할 수 없습니다. 관리자에게 문의해 주세요." },
        { status: 503 }
      );
    }
    const normalAmount = await getSubscriptionAmountCents(serviceSupabase);
    const firstChargeAmount = await getSubscriptionFirstChargeAmount(serviceSupabase);
    const promo = await getSubscriptionPromoConfig(serviceSupabase);
    const appliedPromo =
      promo.enabled &&
      firstChargeAmount === promo.amount_cents &&
      promo.months >= 1;
    const promoRemaining = appliedPromo ? Math.max(0, promo.months - 1) : null;

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    const { error: upsertError } = await serviceSupabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        billing_key,
        plan: "monthly",
        amount_cents: normalAmount,
        status: "active",
        next_billing_at: nextBilling.toISOString().slice(0, 10),
        last_receipt_id: receipt_id,
        updated_at: new Date().toISOString(),
        ...(promoRemaining !== null && { promo_remaining_months: promoRemaining }),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      return NextResponse.json({ error: `구독 저장 실패: ${upsertError.message}` }, { status: 500 });
    }

    await serviceSupabase.from("profiles").update({ subscription_plan: "paid", updated_at: new Date().toISOString() }).eq("id", user.id);

    return NextResponse.json({ ok: true, message: "구독이 시작되었습니다." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message || "구독 등록 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
