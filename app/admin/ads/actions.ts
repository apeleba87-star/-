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

export type SlotType = "direct" | "google" | "coupang";

export async function updateSlotTypeAndScript(
  slotId: string,
  slot_type: SlotType,
  script_content: string | null
) {
  const supabase = await createServerSupabase();
  const payload: { slot_type: SlotType; script_content: string | null; updated_at: string } = {
    slot_type,
    script_content: slot_type === "direct" ? null : script_content ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("home_ad_slots").update(payload).eq("id", slotId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/tenders");
  revalidatePath("/listings");
  revalidatePath("/jobs");
  return { ok: true };
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
