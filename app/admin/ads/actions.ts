"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

const BUCKET = "ad-images";

export async function toggleSlotEnabled(slotId: string, enabled: boolean) {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("home_ad_slots")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", slotId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/tenders");
  revalidatePath("/listings");
  revalidatePath("/jobs");
  return { ok: true };
}

export type SlotType = "direct" | "google" | "coupang" | "coupang_api";

export async function updateSlotTypeAndScript(
  slotId: string,
  slot_type: SlotType,
  script_content: string | null
) {
  const supabase = await createServerSupabase();
  const payload: {
    slot_type: SlotType;
    script_content: string | null;
    updated_at: string;
    coupang_config?: unknown;
  } = {
    slot_type,
    script_content: slot_type === "direct" || slot_type === "coupang_api" ? null : script_content ?? null,
    updated_at: new Date().toISOString(),
  };
  if (slot_type === "coupang_api") {
    const { data: existing } = await supabase
      .from("home_ad_slots")
      .select("key, coupang_config")
      .eq("id", slotId)
      .maybeSingle();
    if (existing && !(existing as { coupang_config?: unknown }).coupang_config) {
      const { defaultCoupangConfigForSlot } = await import("@/lib/coupang-partners/config");
      payload.coupang_config = defaultCoupangConfigForSlot(String((existing as { key: string }).key));
    }
  }
  const { error } = await supabase.from("home_ad_slots").update(payload).eq("id", slotId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/tenders");
  revalidatePath("/listings");
  revalidatePath("/jobs");
  revalidatePath("/tender-awards");
  revalidatePath("/posts");
  return { ok: true };
}

export async function updateSlotFallback(
  slotId: string,
  fallback_type: "google" | "coupang" | null,
  fallback_script_content: string | null
) {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("home_ad_slots")
    .update({
      fallback_type,
      fallback_script_content: fallback_type ? fallback_script_content?.trim() || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);
  if (error) return { ok: false, error: error.message };
  revalidateAllAdPaths();
  return { ok: true };
}

export async function updateSlotCoupangConfig(slotId: string, config: unknown) {
  const supabase = await createServerSupabase();
  const { parseCoupangSlotConfig } = await import("@/lib/coupang-partners/config");
  const parsed = parseCoupangSlotConfig(config);
  if (!parsed) return { ok: false, error: "쿠팡 설정 형식이 올바르지 않습니다." };

  const { error } = await supabase
    .from("home_ad_slots")
    .update({
      slot_type: "coupang_api",
      coupang_config: parsed,
      script_content: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);

  if (error) return { ok: false, error: error.message };
  revalidateAllAdPaths();
  return { ok: true };
}

export async function refreshCoupangSlotNow(slotKey: string) {
  const { refreshCoupangAdSlot } = await import("@/lib/coupang-partners/refresh");
  const result = await refreshCoupangAdSlot(slotKey);
  revalidateAllAdPaths();
  return result;
}

function revalidateAllAdPaths() {
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/tenders");
  revalidatePath("/tender-awards");
  revalidatePath("/listings");
  revalidatePath("/jobs");
  revalidatePath("/news");
}

export type CampaignInput = {
  home_ad_slot_id: string;
  title: string | null;
  description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  sort_order: number;
};

export async function createCampaign(input: CampaignInput) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("home_ad_campaigns")
    .insert({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message, id: null };
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/tenders");
  revalidatePath("/listings");
  revalidatePath("/jobs");
  return { ok: true, id: data.id };
}

export async function updateCampaign(id: string, input: Partial<CampaignInput>) {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("home_ad_campaigns")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/tenders");
  revalidatePath("/listings");
  revalidatePath("/jobs");
  return { ok: true };
}

export async function deleteCampaign(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("home_ad_campaigns").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/tenders");
  revalidatePath("/listings");
  revalidatePath("/jobs");
  return { ok: true };
}

/** FormData에 file 필드로 이미지 전달. 반환: public URL 또는 에러 */
export async function uploadAdImage(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("file") as File | null;
  if (!file?.size) return { ok: false, error: "파일이 없습니다." };
  const supabase = await createServerSupabase();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  revalidatePath("/admin/ads");
  return { ok: true, url: urlData.publicUrl };
}
