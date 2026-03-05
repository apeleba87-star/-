import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { requestBillingPayment, isBootpayConfigured } from "@/lib/bootpay-server";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (CRON_SECRET && bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBootpayConfigured()) {
    return NextResponse.json({ error: "Bootpay not configured" }, { status: 503 });
  }

  const supabase = createServiceSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: due, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, user_id, billing_key, amount_cents")
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
      order_name: "Newslett 프리미엄 월 구독",
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
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
