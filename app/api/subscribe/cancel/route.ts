import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { sendEmail, subscriptionCancelledEmailBody } from "@/lib/email";

/** 구독 취소: status를 cancelled로 변경. 다음 결제일까지는 이용 가능(기존 동작 유지). */
export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, status, next_billing_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ ok: false, error: "구독 정보를 불러오지 못했습니다." }, { status: 500 });
  }
  if (!sub || (sub as { status?: string }).status !== "active") {
    return NextResponse.json({ ok: false, error: "활성 구독이 없습니다." }, { status: 400 });
  }

  const subId = (sub as { id: string }).id;
  const nextBillingAt = (sub as { next_billing_at?: string }).next_billing_at ?? null;

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (updateError) {
    return NextResponse.json({ ok: false, error: "취소 처리에 실패했습니다." }, { status: 500 });
  }

  await supabase.from("subscription_events").insert({
    subscription_id: subId,
    user_id: user.id,
    action: "cancelled",
    previous_status: "active",
    next_status: "cancelled",
    meta: { next_billing_at: nextBillingAt },
  });

  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "[클린아이덱스] 구독 취소 안내",
      html: subscriptionCancelledEmailBody(nextBillingAt ?? ""),
    });
  }

  return NextResponse.json({ ok: true, message: "구독이 취소되었습니다. 다음 결제일까지는 이용 가능합니다." });
}
