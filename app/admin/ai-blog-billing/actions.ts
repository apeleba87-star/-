"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  setAiBlogAmountCents,
  setAiBlogPromoConfig,
  setAiBlogTrialConfig,
  type AiBlogPromoConfig,
  type AiBlogTrialConfig,
} from "@/lib/ai-blog/billing-settings";

export async function saveAiBlogAmount(formData: FormData) {
  const supabase = await createServerSupabase();
  const raw = formData.get("amount_cents");
  const value = raw != null ? Number(String(raw).trim()) : NaN;
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false as const, error: "0 이상의 숫자(원)를 입력해 주세요." };
  }
  const result = await setAiBlogAmountCents(supabase, Math.round(value));
  if (result.ok) revalidatePath("/admin/ai-blog-billing");
  return result;
}

export async function saveAiBlogPromo(formData: FormData) {
  const supabase = await createServerSupabase();
  const enabled = formData.get("promo_enabled") === "on" || formData.get("promo_enabled") === "true";
  const amountRaw = formData.get("promo_amount_cents");
  const optionsRaw = String(formData.get("promo_month_options") ?? "1,2");
  const startDate = formData.get("promo_start_date");
  const endDate = formData.get("promo_end_date");

  const month_options = optionsRaw
    .split(/[,.\s]+/)
    .map((s) => Math.round(Number(s.trim())))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 12);

  const config: Partial<AiBlogPromoConfig> = {
    enabled,
    amount_cents: amountRaw != null ? Number(String(amountRaw).trim()) : 100,
    month_options: month_options.length ? month_options : [1, 2],
    start_date: startDate && String(startDate).trim() ? String(startDate).trim().slice(0, 10) : null,
    end_date: endDate && String(endDate).trim() ? String(endDate).trim().slice(0, 10) : null,
  };
  if (!Number.isFinite(config.amount_cents) || config.amount_cents! < 0) config.amount_cents = 100;

  const result = await setAiBlogPromoConfig(supabase, config);
  if (result.ok) revalidatePath("/admin/ai-blog-billing");
  return result;
}

export async function saveAiBlogTrial(formData: FormData) {
  const supabase = await createServerSupabase();
  const enabled = formData.get("trial_enabled") === "on" || formData.get("trial_enabled") === "true";
  const daysRaw = formData.get("trial_days");
  const config: Partial<AiBlogTrialConfig> = {
    enabled,
    days: daysRaw != null ? Number(String(daysRaw).trim()) : 3,
  };
  if (!Number.isFinite(config.days) || config.days! < 1) config.days = 3;

  const result = await setAiBlogTrialConfig(supabase, config);
  if (result.ok) revalidatePath("/admin/ai-blog-billing");
  return result;
}
