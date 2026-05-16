import { createServiceSupabase } from "@/lib/supabase-server";
import { parseCoupangSlotConfig, defaultCoupangConfigForSlot } from "@/lib/coupang-partners/config";
import { fetchCoupangProductsForConfig, isCoupangPartnersConfigured } from "@/lib/coupang-partners/client";
import type { CoupangBannerProduct } from "@/lib/coupang-partners/types";

type SlotRow = {
  key: string;
  enabled: boolean;
  slot_type: string;
  coupang_config: unknown;
};

export type RefreshCoupangSlotResult = {
  slotKey: string;
  ok: boolean;
  productCount: number;
  error?: string;
};

export async function refreshCoupangAdSlot(slotKey: string): Promise<RefreshCoupangSlotResult> {
  const supabase = createServiceSupabase();

  const { data: slot, error: slotError } = await supabase
    .from("home_ad_slots")
    .select("key, enabled, slot_type, coupang_config")
    .eq("key", slotKey)
    .maybeSingle();

  if (slotError || !slot) {
    return { slotKey, ok: false, productCount: 0, error: slotError?.message ?? "슬롯 없음" };
  }

  const row = slot as SlotRow;
  if (row.slot_type !== "coupang_api") {
    return { slotKey, ok: false, productCount: 0, error: "coupang_api 슬롯이 아닙니다." };
  }

  if (!isCoupangPartnersConfigured()) {
    return { slotKey, ok: false, productCount: 0, error: "쿠팡 API 키 미설정" };
  }

  const config =
    parseCoupangSlotConfig(row.coupang_config) ?? defaultCoupangConfigForSlot(slotKey);

  let products: CoupangBannerProduct[] = [];
  let fetchError: string | null = null;

  try {
    products = await fetchCoupangProductsForConfig(config, slotKey);
    if (products.length === 0) fetchError = "조회된 상품이 없습니다.";
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
    products = [];
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await supabase.from("coupang_ad_cache").upsert(
    {
      slot_key: slotKey,
      products,
      fetch_error: fetchError,
      fetched_at: now,
      updated_at: now,
    },
    { onConflict: "slot_key" }
  );

  if (upsertError) {
    return { slotKey, ok: false, productCount: 0, error: upsertError.message };
  }

  return {
    slotKey,
    ok: !fetchError,
    productCount: products.length,
    error: fetchError ?? undefined,
  };
}

/** enabled + coupang_api 슬롯 전체 갱신 (크론용, 슬롯 간 2초 간격) */
export async function refreshAllCoupangAdSlots(): Promise<RefreshCoupangSlotResult[]> {
  const supabase = createServiceSupabase();
  const { data: slots } = await supabase
    .from("home_ad_slots")
    .select("key")
    .eq("slot_type", "coupang_api")
    .eq("enabled", true);

  const keys = (slots ?? []).map((s) => String((s as { key: string }).key));
  const results: RefreshCoupangSlotResult[] = [];

  for (let i = 0; i < keys.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2000));
    results.push(await refreshCoupangAdSlot(keys[i]));
  }

  return results;
}
