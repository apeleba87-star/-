import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { lookupBillingKeyByReceipt, isBootpayConfigured } from "@/lib/bootpay-server";

const SUBSCRIPTION_AMOUNT_CENTS = 9900;

/** redirect 복귀 시 receipt_id만으로 구독 등록 (빌링키 조회 후 저장) */
export async function POST(req: Request) {
  if (!isBootpayConfigured()) {
    return NextResponse.json({ error: "결제가 설정되지 않았습니다." }, { status: 503 });
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { receipt_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { receipt_id } = body;
  if (!receipt_id || typeof receipt_id !== "string") {
    return NextResponse.json({ error: "receipt_id가 필요합니다." }, { status: 400 });
  }

  const result = await lookupBillingKeyByReceipt(receipt_id);
  if (!result?.billing_key) {
    return NextResponse.json({ error: "빌링키를 조회할 수 없습니다. 결제를 다시 시도해 주세요." }, { status: 400 });
  }

  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1);

  const { error: upsertError } = await supabase.from("subscriptions").upsert(
    {
      user_id: user.id,
      billing_key: result.billing_key,
      plan: "monthly",
      amount_cents: SUBSCRIPTION_AMOUNT_CENTS,
      status: "active",
      next_billing_at: nextBilling.toISOString().slice(0, 10),
      last_receipt_id: receipt_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await supabase.from("profiles").update({ subscription_plan: "paid", updated_at: new Date().toISOString() }).eq("id", user.id);

  return NextResponse.json({ ok: true, message: "구독이 시작되었습니다." });
}
