import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, addMonths } from "@/lib/ai-blog/access";
import { AI_BLOG_PAID_PLAN } from "@/lib/ai-blog/billing-settings";
import { kstToday } from "@/lib/ai-blog/stats";

type ActivateInput = {
  userId: string;
  billingKey: string;
  receiptId?: string | null;
  /** 정상 월 금액 (원) — 구독 행에 저장 */
  amountCents: number;
  /** 프로모 적용 시 총 프로모 개월 (1 또는 2). 미적용이면 0 */
  promoMonths: number;
  actorId?: string;
};

/**
 * 결제 성공 후 AI 블로그 구독 행 upsert + PRO 권한 부여(1개월 구간).
 * 이후 갱신은 cron이 next_billing_at 기준으로 처리.
 */
export async function activateAiBlogPaidSubscription(
  supabase: SupabaseClient,
  input: ActivateInput,
): Promise<{ ok: true; nextBillingAt: string; expiresOn: string } | { ok: false; error: string }> {
  const today = kstToday();
  const nextBillingAt = addMonths(today, 1);
  const expiresOn = addDays(nextBillingAt, -1);
  const promoRemaining =
    input.promoMonths >= 1 ? Math.max(0, input.promoMonths - 1) : null;

  const { error: subError } = await supabase.from("ai_blog_subscriptions").upsert(
    {
      user_id: input.userId,
      billing_key: input.billingKey,
      plan_code: AI_BLOG_PAID_PLAN,
      amount_cents: input.amountCents,
      status: "active",
      promo_months: input.promoMonths,
      promo_remaining_months: promoRemaining,
      next_billing_at: nextBillingAt,
      last_receipt_id: input.receiptId ?? null,
      last_billed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (subError) return { ok: false, error: subError.message };

  const db = supabase.schema("cleanidex");
  const { data: current } = await db
    .from("ai_blog_access")
    .select("expires_on, plan_code, memo")
    .eq("user_id", input.userId)
    .maybeSingle<{ expires_on: string; plan_code: string; memo: string | null }>();

  // 이미 남은 유료 기간이 더 길면 유지, 아니면 새 결제 구간으로
  let finalExpires = expiresOn;
  if (current?.expires_on && current.expires_on > expiresOn && current.plan_code === AI_BLOG_PAID_PLAN) {
    finalExpires = current.expires_on;
  }

  const { error: accessError } = await db.from("ai_blog_access").upsert(
    {
      user_id: input.userId,
      plan_code: AI_BLOG_PAID_PLAN,
      status: "active",
      expires_on: finalExpires,
      memo: input.promoMonths
        ? `부트페이 구독 · 프로모 ${input.promoMonths}개월`
        : "부트페이 구독",
      granted_by: input.actorId ?? input.userId,
    },
    { onConflict: "user_id" },
  );
  if (accessError) return { ok: false, error: accessError.message };

  await db.from("ai_blog_access_logs").insert({
    user_id: input.userId,
    action: current ? "subscribe_renew" : "subscribe",
    plan_code: AI_BLOG_PAID_PLAN,
    prev_expires_on: current?.expires_on ?? null,
    new_expires_on: finalExpires,
    amount_krw: null,
    payer_name: null,
    memo: input.promoMonths
      ? `첫 결제 프로모 ${input.promoMonths}개월 (잔여 프로모 ${promoRemaining ?? 0}개월)`
      : "유료 구독 시작",
    actor_id: input.actorId ?? input.userId,
  });

  return { ok: true, nextBillingAt, expiresOn: finalExpires };
}

/** 정기 결제 성공 시 이용 기간 1개월 연장 */
export async function extendAiBlogAccessAfterBilling(
  supabase: SupabaseClient,
  userId: string,
  nextBillingAt: string,
): Promise<void> {
  const expiresOn = addDays(nextBillingAt, -1);
  const db = supabase.schema("cleanidex");
  const { data: current } = await db
    .from("ai_blog_access")
    .select("expires_on")
    .eq("user_id", userId)
    .maybeSingle<{ expires_on: string }>();

  const finalExpires =
    current?.expires_on && current.expires_on > expiresOn ? current.expires_on : expiresOn;

  await db.from("ai_blog_access").upsert(
    {
      user_id: userId,
      plan_code: AI_BLOG_PAID_PLAN,
      status: "active",
      expires_on: finalExpires,
      granted_by: userId,
    },
    { onConflict: "user_id" },
  );

  await db.from("ai_blog_access_logs").insert({
    user_id: userId,
    action: "billing_extend",
    plan_code: AI_BLOG_PAID_PLAN,
    prev_expires_on: current?.expires_on ?? null,
    new_expires_on: finalExpires,
    amount_krw: null,
    payer_name: null,
    memo: "정기 결제 성공 · 이용 기간 연장",
    actor_id: userId,
  });
}
