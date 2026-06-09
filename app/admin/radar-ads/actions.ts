"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
const AD_IMAGE_BUCKET = "ad-images";
import { validateRadarAdCtaUrl } from "@/lib/demand/radar-ads-cta";
import {
  clampRadarAdCopy,
  validateRadarAdCopy,
  type RadarAdSlotCategory,
  type RadarAdSlotStatus,
} from "@/lib/demand/radar-ads-shared";
import { normalizeRadarAdSlotStatusForSave } from "@/lib/demand/radar-ad-slot-lifecycle";
import { getKstTodayString } from "@/lib/jobs/kst-date";

async function requireStaff() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { supabase, error: "권한이 없습니다." };
  }
  return { supabase, error: null };
}

function revalidateRadarAds() {
  revalidatePath("/admin/radar-ads");
  revalidatePath("/");
}

export async function updateRadarBannerSettings(
  bannerId: string,
  enabled: boolean,
  rotationSeconds: number
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, error: authErr } = await requireStaff();
  if (authErr) return { ok: false, error: authErr };

  const rotation = Math.min(60, Math.max(5, Math.round(rotationSeconds)));
  const { error } = await supabase
    .from("radar_ad_banners")
    .update({ enabled, rotation_seconds: rotation, updated_at: new Date().toISOString() })
    .eq("id", bannerId);
  if (error) return { ok: false, error: error.message };
  revalidateRadarAds();
  return { ok: true };
}

export type RadarAdSlotInput = {
  banner_id: string;
  slot_index: number;
  category: RadarAdSlotCategory;
  title: string;
  description: string;
  image_url: string | null;
  image_crop_x: number;
  image_crop_y: number;
  image_crop_w: number;
  image_crop_h: number;
  cta_text: string;
  cta_url: string;
  advertiser_name: string;
  monthly_fee: number | null;
  memo: string;
  start_date: string;
  end_date: string;
  status: RadarAdSlotStatus;
};

export async function upsertRadarAdSlot(
  input: RadarAdSlotInput
): Promise<{ ok: boolean; error?: string; notice?: string }> {
  const { supabase, error: authErr } = await requireStaff();
  if (authErr) return { ok: false, error: authErr };

  const copyErr = validateRadarAdCopy({
    advertiser_name: input.advertiser_name,
    title: input.title,
    description: input.description,
    cta_text: input.cta_text,
  });
  if (copyErr) return { ok: false, error: copyErr };

  if (input.start_date > input.end_date) {
    return { ok: false, error: "종료일은 시작일보다 같거나 늦어야 합니다." };
  }

  const today = getKstTodayString();
  const status = normalizeRadarAdSlotStatusForSave(
    input.status,
    input.start_date,
    input.end_date,
    today
  );

  const row = {
    banner_id: input.banner_id,
    slot_index: input.slot_index,
    category: input.category,
    title: clampRadarAdCopy("title", input.title.trim()),
    description: clampRadarAdCopy("description", input.description.trim()) || null,
    image_url: input.image_url?.trim() || null,
    image_crop_x: input.image_crop_x,
    image_crop_y: input.image_crop_y,
    image_crop_w: input.image_crop_w,
    image_crop_h: input.image_crop_h,
    cta_text: clampRadarAdCopy("ctaText", input.cta_text.trim()) || "자세히",
    cta_url: input.cta_url.trim(),
    advertiser_name: clampRadarAdCopy("advertiserName", input.advertiser_name.trim()) || null,
    monthly_fee: input.monthly_fee,
    memo: input.memo.trim() || null,
    start_date: input.start_date,
    end_date: input.end_date,
    status,
    updated_at: new Date().toISOString(),
  };

  if (!row.title) {
    return { ok: false, error: "제목을 입력하세요." };
  }

  const ctaErr = validateRadarAdCtaUrl(row.cta_url);
  if (ctaErr) return { ok: false, error: ctaErr };

  const { error } = await supabase.from("radar_ad_slots").upsert(row, {
    onConflict: "banner_id,slot_index",
  });
  if (error) return { ok: false, error: error.message };
  revalidateRadarAds();
  const notice =
    input.status === "active" && status === "paused"
      ? "종료일이 지나 게재 상태를 중지로 저장했습니다."
      : undefined;
  return { ok: true, notice };
}

/** 기간 만료인데 아직 active인 슬롯 → paused (성과 기록 유지) */
export async function archiveExpiredRadarAdSlots(): Promise<{
  ok: boolean;
  error?: string;
  updatedCount?: number;
}> {
  const { supabase, error: authErr } = await requireStaff();
  if (authErr) return { ok: false, error: authErr };

  const today = getKstTodayString();
  const { data, error } = await supabase
    .from("radar_ad_slots")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("status", "active")
    .lt("end_date", today)
    .select("id");

  if (error) return { ok: false, error: error.message };
  revalidateRadarAds();
  revalidatePath("/demand");
  return { ok: true, updatedCount: data?.length ?? 0 };
}

export async function createRegionalBanner(
  regionKey: string
): Promise<{ ok: boolean; error?: string; bannerId?: string }> {
  const { supabase, error: authErr } = await requireStaff();
  if (authErr) return { ok: false, error: authErr };

  const key = regionKey.trim();
  if (!key || key === "national") {
    return { ok: false, error: "region_key 예: city:seoul 또는 district:seoul:mapo-gu" };
  }

  const { data, error } = await supabase
    .from("radar_ad_banners")
    .insert({
      scope: "regional",
      region_key: key,
      enabled: true,
      rotation_seconds: 10,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "이미 등록된 지역입니다." };
    return { ok: false, error: error.message };
  }
  revalidateRadarAds();
  return { ok: true, bannerId: data.id as string };
}

/** revalidate 없음 — 업로드만 하고 슬롯 저장 전 폼 입력이 유지되도록 */
export async function uploadRadarAdImage(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { supabase, error: authErr } = await requireStaff();
  if (authErr) return { ok: false, error: authErr };

  const file = formData.get("file") as File | null;
  if (!file?.size) return { ok: false, error: "파일이 없습니다." };

  const ext = file.name.split(".").pop() || "jpg";
  const path = `radar/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from(AD_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };

  const { data: urlData } = supabase.storage.from(AD_IMAGE_BUCKET).getPublicUrl(data.path);
  return { ok: true, url: urlData.publicUrl };
}
