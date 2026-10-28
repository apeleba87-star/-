import "server-only";
import { createServiceSupabase } from "@/lib/supabase-server";
import { addDays } from "@/lib/ai-blog/access";
import { getAiBlogTrialConfig, AI_BLOG_TRIAL_PLAN } from "@/lib/ai-blog/billing-settings";
import { kstToday } from "@/lib/ai-blog/stats";

/**
 * 무료 체험 1회 부여 (3일 / TRIAL 플랜 3개 한도).
 * 이미 권한·체험·유료 구독이 있으면 스킵.
 */
export async function ensureAiBlogTrial(userId: string): Promise<{
  granted: boolean;
  reason?: string;
  expires_on?: string;
}> {
  const service = createServiceSupabase();
  const trial = await getAiBlogTrialConfig(service);
  if (!trial.enabled) return { granted: false, reason: "trial_disabled" };

  const db = service.schema("cleanidex");
  const today = kstToday();

  const { data: existingAccess } = await db
    .from("ai_blog_access")
    .select("user_id, plan_code, status, expires_on")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingAccess) {
    return { granted: false, reason: "already_has_access", expires_on: existingAccess.expires_on };
  }

  const { data: claim } = await service
    .from("ai_blog_trial_claims")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (claim) return { granted: false, reason: "trial_already_claimed" };

  const { data: paidSub } = await service
    .from("ai_blog_subscriptions")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (paidSub && (paidSub as { status: string }).status === "active") {
    return { granted: false, reason: "has_subscription" };
  }

  const expiresOn = addDays(today, trial.days - 1);
  const planCode = trial.plan_code || AI_BLOG_TRIAL_PLAN;

  const { error: accessError } = await db.from("ai_blog_access").insert({
    user_id: userId,
    plan_code: planCode,
    status: "active",
    expires_on: expiresOn,
    memo: `무료 체험 ${trial.days}일`,
    granted_by: userId,
  });
  if (accessError) {
    // 동시성: 이미 생성된 경우
    if (/duplicate|unique/i.test(accessError.message)) {
      return { granted: false, reason: "already_has_access" };
    }
    return { granted: false, reason: accessError.message };
  }

  await service.from("ai_blog_trial_claims").upsert(
    { user_id: userId, claimed_at: new Date().toISOString(), expires_on: expiresOn },
    { onConflict: "user_id" },
  );

  await db.from("ai_blog_access_logs").insert({
    user_id: userId,
    action: "trial_grant",
    plan_code: planCode,
    prev_expires_on: null,
    new_expires_on: expiresOn,
    amount_krw: 0,
    payer_name: null,
    memo: `무료 체험 ${trial.days}일 · 블로그 ${3}개`,
    actor_id: userId,
  });

  return { granted: true, expires_on: expiresOn };
}
