"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { setSubscriptionAmountCents, setSubscriptionPromoConfig } from "@/lib/app-settings";
import type { SubscriptionPromoConfig } from "@/lib/app-settings";

export async function saveSubscriptionAmount(formData: FormData) {
  const supabase = await createServerSupabase();
  const raw = formData.get("amount_cents");
  const value = raw != null ? Number(String(raw).trim()) : NaN;
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false as const, error: "0 이상의 숫자(원)를 입력해 주세요." };
  }
  const result = await setSubscriptionAmountCents(supabase, Math.round(value));
  if (result.ok) revalidatePath("/admin/subscription-config");
  return result;
}

export async function saveSubscriptionPromo(formData: FormData) {
  const supabase = await createServerSupabase();
  const enabled = formData.get("promo_enabled") === "on" || formData.get("promo_enabled") === "true";
  const amountRaw = formData.get("promo_amount_cents");
  const monthsRaw = formData.get("promo_months");
  const startDate = formData.get("promo_start_date");
  const endDate = formData.get("promo_end_date");

  const config: Partial<SubscriptionPromoConfig> = {
    enabled,
    amount_cents: amountRaw != null ? Number(String(amountRaw).trim()) : 100,
    months: monthsRaw != null ? Number(String(monthsRaw).trim()) : 3,
    start_date: startDate && String(startDate).trim() ? String(startDate).trim().slice(0, 10) : null,
    end_date: endDate && String(endDate).trim() ? String(endDate).trim().slice(0, 10) : null,
  };
  if (!Number.isFinite(config.amount_cents) || config.amount_cents! < 0) config.amount_cents = 100;
  if (!Number.isFinite(config.months) || config.months! < 1) config.months = 3;
  if (config.months! > 12) config.months = 12;

  const result = await setSubscriptionPromoConfig(supabase, config);
  if (result.ok) revalidatePath("/admin/subscription-config");
  return result;
}
