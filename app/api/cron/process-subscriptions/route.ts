import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { requestBillingPayment, isBootpayConfigured } from "@/lib/bootpay-server";
import { sendEmail, subscriptionPaymentFailedEmailBody } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBootpayConfigured()) {
    return NextResponse.json({ error: "Bootpay not configured" }, { status: 503 });
  }

  const supabase = createServiceSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: due, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, user_id, billing_key, amount_cents, next_billing_at")
    .eq("status", "active")
    .lte("next_billing_at", today);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const sub of due ?? []) {
    const orderId = `order_${sub.id}_${Date.now()}`;
    const payment = await requestBillingPayment({
      billing_key: sub.billing_key,
      order_id: orderId,
      order_name: "클린아이덱스 프리미엄 월 구독",
      price: sub.amount_cents,
    });

    if (payment.success && payment.receipt_id) {
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      await supabase
        .from("subscriptions")
        .update({
          next_billing_at: next.toISOString().slice(0, 10),
          last_receipt_id: payment.receipt_id,
          last_billed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      results.push({ id: sub.id, ok: true });
    } else {
      await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      results.push({ id: sub.id, ok: false, error: payment.error });

      await supabase.from("subscription_events").insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        action: "past_due",
        previous_status: "active",
        next_status: "past_due",
        meta: { error: payment.error, next_billing_at: (sub as { next_billing_at?: string }).next_billing_at },
      });

      const { data: profile } = await supabase.from("profiles").select("email").eq("id", sub.user_id).maybeSingle();
      const email = (profile as { email?: string | null } | null)?.email;
      if (email?.trim()) {
        await sendEmail({
          to: email,
          subject: "[클린아이덱스] 구독 결제에 실패했습니다",
          html: subscriptionPaymentFailedEmailBody("결제 수단을 확인해 주시거나 구독 페이지에서 다시 결제해 주세요."),
        });
      }
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
