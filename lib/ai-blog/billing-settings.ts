/**
 * AI 블로그 결제 설정 (app_settings)
 * - ai_blog_amount_cents: 정상 월 금액(원)
 * - ai_blog_promo: { enabled, amount_cents, month_options, start_date, end_date }
 * - ai_blog_trial: { enabled, days, plan_code }
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const KEY_AMOUNT = "ai_blog_amount_cents";
const KEY_PROMO = "ai_blog_promo";
const KEY_TRIAL = "ai_blog_trial";

export const AI_BLOG_PAID_PLAN = "PRO";
export const AI_BLOG_TRIAL_PLAN = "TRIAL";

const DEFAULT_AMOUNT = 29900;

export type AiBlogPromoConfig = {
  enabled: boolean;
  amount_cents: number;
  /** 사용자가 결제 시 고를 수 있는 프로모 개월 (예: [1, 2]) */
  month_options: number[];
  start_date: string | null;
  end_date: string | null;
};

export type AiBlogTrialConfig = {
  enabled: boolean;
  days: number;
  plan_code: string;
};

const DEFAULT_PROMO: AiBlogPromoConfig = {
  enabled: true,
  amount_cents: 100,
  month_options: [1, 2],
  start_date: null,
  end_date: null,
};

const DEFAULT_TRIAL: AiBlogTrialConfig = {
  enabled: true,
  days: 3,
  plan_code: AI_BLOG_TRIAL_PLAN,
};

function isDateInRange(today: string, start: string | null, end: string | null): boolean {
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

function parseMonthOptions(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_PROMO.month_options;
  const opts = raw
    .map((n) => Math.round(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 12);
  return opts.length ? [...new Set(opts)].sort((a, b) => a - b) : DEFAULT_PROMO.month_options;
}

function parsePromo(value: unknown): AiBlogPromoConfig {
  if (value == null || typeof value !== "object") return DEFAULT_PROMO;
  const o = value as Record<string, unknown>;
  // 레거시 months 단일값 호환
  const legacyMonths =
    Number.isFinite(Number(o.months)) && Number(o.months) >= 1
      ? [Math.min(12, Math.round(Number(o.months)))]
      : null;
  return {
    enabled: o.enabled === true,
    amount_cents: Number.isFinite(Number(o.amount_cents))
      ? Math.max(0, Math.round(Number(o.amount_cents)))
      : DEFAULT_PROMO.amount_cents,
    month_options: o.month_options != null ? parseMonthOptions(o.month_options) : legacyMonths ?? DEFAULT_PROMO.month_options,
    start_date: typeof o.start_date === "string" && o.start_date.trim() ? o.start_date.trim().slice(0, 10) : null,
    end_date: typeof o.end_date === "string" && o.end_date.trim() ? o.end_date.trim().slice(0, 10) : null,
  };
}

function parseTrial(value: unknown): AiBlogTrialConfig {
  if (value == null || typeof value !== "object") return DEFAULT_TRIAL;
  const o = value as Record<string, unknown>;
  return {
    enabled: o.enabled !== false,
    days: Number.isFinite(Number(o.days)) && Number(o.days) >= 1 ? Math.min(30, Math.round(Number(o.days))) : DEFAULT_TRIAL.days,
    plan_code: typeof o.plan_code === "string" && o.plan_code.trim() ? o.plan_code.trim() : DEFAULT_TRIAL.plan_code,
  };
}

export async function getAiBlogAmountCents(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", KEY_AMOUNT).single();
  if (error || data?.value == null) return DEFAULT_AMOUNT;
  const n = typeof data.value === "number" ? data.value : Number(data.value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : DEFAULT_AMOUNT;
}

export async function setAiBlogAmountCents(
  supabase: SupabaseClient,
  amountCents: number,
): Promise<{ ok: boolean; error?: string }> {
  const value = Math.round(amountCents);
  if (value < 0) return { ok: false, error: "금액은 0 이상이어야 합니다." };
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: KEY_AMOUNT, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getAiBlogPromoConfig(supabase: SupabaseClient): Promise<AiBlogPromoConfig> {
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", KEY_PROMO).single();
  if (error || data?.value == null) return DEFAULT_PROMO;
  return parsePromo(data.value);
}

export async function setAiBlogPromoConfig(
  supabase: SupabaseClient,
  config: Partial<AiBlogPromoConfig>,
): Promise<{ ok: boolean; error?: string }> {
  const current = await getAiBlogPromoConfig(supabase);
  const merged: AiBlogPromoConfig = {
    enabled: config.enabled ?? current.enabled,
    amount_cents: config.amount_cents ?? current.amount_cents,
    month_options: config.month_options ?? current.month_options,
    start_date: config.start_date !== undefined ? config.start_date : current.start_date,
    end_date: config.end_date !== undefined ? config.end_date : current.end_date,
  };
  if (!merged.month_options.length) {
    return { ok: false, error: "프로모 개월 옵션을 1개 이상 지정해 주세요." };
  }
  if (merged.amount_cents < 0) return { ok: false, error: "프로모 금액은 0 이상이어야 합니다." };
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: KEY_PROMO, value: merged, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getAiBlogTrialConfig(supabase: SupabaseClient): Promise<AiBlogTrialConfig> {
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", KEY_TRIAL).single();
  if (error || data?.value == null) return DEFAULT_TRIAL;
  return parseTrial(data.value);
}

export async function setAiBlogTrialConfig(
  supabase: SupabaseClient,
  config: Partial<AiBlogTrialConfig>,
): Promise<{ ok: boolean; error?: string }> {
  const current = await getAiBlogTrialConfig(supabase);
  const merged: AiBlogTrialConfig = {
    enabled: config.enabled ?? current.enabled,
    days: config.days ?? current.days,
    plan_code: config.plan_code ?? current.plan_code,
  };
  if (merged.days < 1 || merged.days > 30) {
    return { ok: false, error: "체험 일수는 1~30일 사이로 설정해 주세요." };
  }
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: KEY_TRIAL, value: merged, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 프로모가 유효하면 true */
export function isAiBlogPromoActive(promo: AiBlogPromoConfig, today = new Date().toISOString().slice(0, 10)): boolean {
  return promo.enabled && isDateInRange(today, promo.start_date, promo.end_date);
}

/** 선택한 프로모 개월에 대한 첫 결제 금액. 프로모 불가/미선택이면 정상가 */
export async function getAiBlogFirstChargeAmount(
  supabase: SupabaseClient,
  promoMonths: number | null,
): Promise<{ amountCents: number; appliedPromo: boolean; promoMonths: number }> {
  const normal = await getAiBlogAmountCents(supabase);
  const promo = await getAiBlogPromoConfig(supabase);
  if (!isAiBlogPromoActive(promo) || promoMonths == null) {
    return { amountCents: normal, appliedPromo: false, promoMonths: 0 };
  }
  if (!promo.month_options.includes(promoMonths)) {
    return { amountCents: normal, appliedPromo: false, promoMonths: 0 };
  }
  return { amountCents: promo.amount_cents, appliedPromo: true, promoMonths };
}

export async function getAiBlogPromoAmountCents(supabase: SupabaseClient): Promise<number> {
  const promo = await getAiBlogPromoConfig(supabase);
  return promo.enabled ? Math.max(0, promo.amount_cents) : 0;
}
