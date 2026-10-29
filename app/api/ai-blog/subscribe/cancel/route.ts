import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

/** AI 블로그 구독 취소. 다음 결제일 전까지는 이용 가능. 쓰기는 service_role만. */
export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  let service;
  try {
    service = createServiceSupabase();
  } catch {
    return NextResponse.json({ ok: false, error: "서버 설정 오류입니다." }, { status: 503 });
  }

  const { data: sub, error: fetchError } = await service
    .from("ai_blog_subscriptions")
    .select("id, status, next_billing_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ ok: false, error: "구독 정보를 불러오지 못했습니다." }, { status: 500 });
  }
  if (!sub || (sub as { status?: string }).status !== "active") {
    return NextResponse.json({ ok: false, error: "활성 구독이 없습니다." }, { status: 400 });
  }

  const { error: updateError } = await service
    .from("ai_blog_subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (updateError) {
    return NextResponse.json({ ok: false, error: "취소 처리에 실패했습니다." }, { status: 500 });
  }

  const nextBillingAt = (sub as { next_billing_at?: string }).next_billing_at ?? null;
  return NextResponse.json({
    ok: true,
    message: "구독이 취소되었습니다. 다음 결제일까지는 이용 가능합니다.",
    next_billing_at: nextBillingAt,
  });
}
