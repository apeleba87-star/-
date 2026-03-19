/**
 * 앱 전역 설정 (app_settings) 읽기/쓰기
 * - tender_keywords_enabled: 입찰 수집·백필 시 키워드 기반 categories 적용 여부
 * - subscription_amount_cents: 프리미엄 구독 월 결제 금액(원). 미설정 시 9900
 * - subscription_promo: 이벤트성 프로모 { enabled, amount_cents, months, start_date, end_date }
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const KEY_TENDER_KEYWORDS = "tender_keywords_enabled";
const KEY_SUBSCRIPTION_AMOUNT_CENTS = "subscription_amount_cents";
const KEY_SUBSCRIPTION_PROMO = "subscription_promo";
const DEFAULT_SUBSCRIPTION_AMOUNT_CENTS = 9900;

export type SubscriptionPromoConfig = {
  enabled: boolean;
  amount_cents: number;
  months: number;
  start_date: string | null;
  end_date: string | null;
};

const DEFAULT_PROMO: SubscriptionPromoConfig = {
  enabled: false,
  amount_cents: 100,
  months: 3,
  start_date: null,
  end_date: null,
};

export async function getTenderKeywordsEnabled(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", KEY_TENDER_KEYWORDS)
    .single();
  if (error || data?.value == null) return false;
  return data.value === true || data.value === "true";
}

export async function setTenderKeywordsEnabled(
  supabase: SupabaseClient,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: KEY_TENDER_KEYWORDS, value: enabled, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getSubscriptionAmountCents(
  supabase: SupabaseClient
): Promise<number> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", KEY_SUBSCRIPTION_AMOUNT_CENTS)
    .single();
  if (error || data?.value == null) return DEFAULT_SUBSCRIPTION_AMOUNT_CENTS;
  const n = typeof data.value === "number" ? data.value : Number(data.value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : DEFAULT_SUBSCRIPTION_AMOUNT_CENTS;
}

export async function setSubscriptionAmountCents(
  supabase: SupabaseClient,
  amountCents: number
): Promise<{ ok: boolean; error?: string }> {
  const value = Math.round(amountCents);
  if (value < 0) return { ok: false, error: "금액은 0 이상이어야 합니다." };
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: KEY_SUBSCRIPTION_AMOUNT_CENTS, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function parsePromoConfig(value: unknown): SubscriptionPromoConfig {
  if (value == null || typeof value !== "object") return DEFAULT_PROMO;
  const o = value as Record<string, unknown>;
  const start = o.start_date;
  const end = o.end_date;
  return {
    enabled: o.enabled === true,
    amount_cents: Number.isFinite(Number(o.amount_cents)) ? Math.max(0, Math.round(Number(o.amount_cents))) : DEFAULT_PROMO.amount_cents,
    months: Number.isFinite(Number(o.months)) && Number(o.months) >= 1 ? Math.min(12, Math.round(Number(o.months))) : DEFAULT_PROMO.months,
    start_date: typeof start === "string" && start.trim() ? start.trim().slice(0, 10) : null,
    end_date: typeof end === "string" && end.trim() ? end.trim().slice(0, 10) : null,
  };
}

function isDateInRange(today: string, start: string | null, end: string | null): boolean {
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

export async function getSubscriptionPromoConfig(
  supabase: SupabaseClient
): Promise<SubscriptionPromoConfig> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", KEY_SUBSCRIPTION_PROMO)
    .single();
  if (error || data?.value == null) return DEFAULT_PROMO;
  return parsePromoConfig(data.value);
}

export async function setSubscriptionPromoConfig(
  supabase: SupabaseClient,
  config: Partial<SubscriptionPromoConfig>
): Promise<{ ok: boolean; error?: string }> {
  const current = await getSubscriptionPromoConfig(supabase);
  const merged: SubscriptionPromoConfig = {
    enabled: config.enabled ?? current.enabled,
    amount_cents: config.amount_cents ?? current.amount_cents,
    months: config.months ?? current.months,
    start_date: config.start_date !== undefined ? config.start_date : current.start_date,
    end_date: config.end_date !== undefined ? config.end_date : current.end_date,
  };
  if (merged.months < 1 || merged.months > 12) {
    return { ok: false, error: "프로모 적용 개월은 1~12 사이로 설정해 주세요." };
  }
  if (merged.amount_cents < 0) {
    return { ok: false, error: "프로모 금액은 0 이상이어야 합니다." };
  }
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: KEY_SUBSCRIPTION_PROMO, value: merged, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 신규 가입 시 첫 결제 금액. 프로모 기간 내면 프로모 금액, 아니면 정상가 */
export async function getSubscriptionFirstChargeAmount(
  supabase: SupabaseClient
): Promise<number> {
  const normal = await getSubscriptionAmountCents(supabase);
  const promo = await getSubscriptionPromoConfig(supabase);
  if (!promo.enabled) return normal;
  const today = new Date().toISOString().slice(0, 10);
  if (!isDateInRange(today, promo.start_date, promo.end_date)) return normal;
  return promo.amount_cents;
}

/** cron 등에서 프로모 금액 조회 (promo_remaining_months > 0 일 때 사용) */
export async function getSubscriptionPromoAmountCents(
  supabase: SupabaseClient
): Promise<number> {
  const promo = await getSubscriptionPromoConfig(supabase);
  return promo.enabled ? Math.max(0, promo.amount_cents) : 0;
}
