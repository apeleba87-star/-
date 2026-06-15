"use server";

import { revalidatePath } from "next/cache";

import {
  buildMagamBodyText,
  magamPriceText,
  magamScheduleText,
  type MagamListingDraft,
} from "@/lib/magam/listing-draft";
import { normalizeMagamPhone } from "@/lib/magam/phone";
import { magamRegionDisplayLabel } from "@/lib/magam/regions";
import { MAGAM_MY_LISTINGS_LIMIT } from "@/lib/magam/my-listings";
import { MAGAM_SYNC_CONSENT_VERSION } from "@/lib/magam/copy";
import type { MagamListingRow } from "@/lib/magam/types";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

const LISTING_SELECT =
  "id, user_id, listing_type, region_gu, body_text, contact_phone, price_text, schedule_text, special_notes, status, share_slug, linked_service_disclosed, created_at, updated_at, closed_at, schedule_date, time_slot, city_id, district_slug, work_kind, pyeong, ac_types, price_amount, price_unit";

export type MagamWriteBootstrap = {
  contactPhone: string | null;
  alreadyConsented: boolean;
};

export type MagamActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getMagamWriteBootstrap(): Promise<MagamWriteBootstrap> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return { contactPhone: null, alreadyConsented: false };
  }

  const { data } = await supabase
    .from("profiles")
    .select("magam_contact_phone, magam_sync_consent_at")
    .eq("id", user.id)
    .maybeSingle();

  const phone = (data?.magam_contact_phone as string | null)?.trim() || null;
  const consented = Boolean(data?.magam_sync_consent_at);

  return {
    contactPhone: phone,
    alreadyConsented: consented,
  };
}

export async function getMyMagamListings(): Promise<{
  listings: MagamListingRow[];
  hasMore: boolean;
}> {
  const { supabase, user } = await requireUser();
  if (!user) return { listings: [], hasMore: false };

  const { data } = await supabase
    .from("magam_listings")
    .select(LISTING_SELECT)
    .eq("user_id", user.id)
    .order("status", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAGAM_MY_LISTINGS_LIMIT + 1);

  const rows = (data as MagamListingRow[] | null) ?? [];
  const hasMore = rows.length > MAGAM_MY_LISTINGS_LIMIT;

  return {
    listings: rows.slice(0, MAGAM_MY_LISTINGS_LIMIT),
    hasMore,
  };
}

export async function getMagamListingForOwner(id: string): Promise<MagamListingRow | null> {
  const { supabase, user } = await requireUser();
  if (!user) return null;

  const { data } = await supabase
    .from("magam_listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as MagamListingRow | null) ?? null;
}

export type CreateMagamListingInput = MagamListingDraft & {
  contactPhone: string;
  linkedServiceDisclosed: boolean;
};

export async function createMagamListing(
  input: CreateMagamListingInput
): Promise<MagamActionResult<{ id: string; shareSlug: string }>> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const phone = normalizeMagamPhone(input.contactPhone);
  if (phone.length < 10) {
    return { ok: false, error: "연락처를 입력해 주세요." };
  }

  if (!input.linkedServiceDisclosed) {
    return { ok: false, error: "「모집 안내 노출 동의」에 체크해야 글을 올릴 수 있습니다." };
  }

  const draft: MagamListingDraft = input;
  const bodyText = buildMagamBodyText(draft);
  if (bodyText.trim().length < 2) {
    return { ok: false, error: "공고 내용을 확인해 주세요." };
  }

  const regionGu = magamRegionDisplayLabel(input.cityId, input.districtSlug);
  if (!regionGu) {
    return { ok: false, error: "지역을 선택해 주세요." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("magam_sync_consent_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.magam_sync_consent_at) {
    await supabase
      .from("profiles")
      .update({
        magam_sync_consent_at: new Date().toISOString(),
        magam_sync_consent_version: MAGAM_SYNC_CONSENT_VERSION,
      })
      .eq("id", user.id);
  }

  await supabase
    .from("profiles")
    .update({ magam_contact_phone: phone })
    .eq("id", user.id);

  const { data, error } = await supabase
    .from("magam_listings")
    .insert({
      user_id: user.id,
      listing_type: input.listingType,
      region_gu: regionGu,
      city_id: input.cityId,
      district_slug: input.districtSlug,
      body_text: bodyText.trim(),
      contact_phone: phone,
      work_kind: input.workKind || null,
      schedule_date: input.scheduleDate || null,
      time_slot: input.timeSlot || null,
      pyeong: input.listingType === "hiring" ? null : input.pyeong ?? null,
      ac_types: input.listingType === "hiring" ? [] : input.acTypes ?? [],
      price_amount: input.priceAmount ?? null,
      price_unit: input.priceAmount != null ? input.priceUnit ?? "man" : null,
      price_text: magamPriceText(draft),
      schedule_text: magamScheduleText(draft),
      special_notes: input.specialNotes?.trim() || null,
      linked_service_disclosed: input.linkedServiceDisclosed,
    })
    .select("id, share_slug")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/magam/live");
  revalidatePath("/magam/me");
  revalidatePath(`/p/${data.share_slug}`);

  return { ok: true, data: { id: data.id as string, shareSlug: data.share_slug as string } };
}

export async function closeMagamListing(id: string): Promise<MagamActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: existing } = await supabase
    .from("magam_listings")
    .select("share_slug, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return { ok: false, error: "공고를 찾을 수 없습니다." };
  if (existing.status === "closed") return { ok: true };

  const { error } = await supabase
    .from("magam_listings")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/magam/live");
  revalidatePath("/magam/me");
  revalidatePath(`/magam/listing/${id}`);
  revalidatePath(`/p/${existing.share_slug}`);

  return { ok: true };
}

export type MagamSettingsBootstrap = {
  email: string | null;
  contactPhone: string | null;
  consentGranted: boolean;
};

export async function getMagamSettingsBootstrap(): Promise<MagamSettingsBootstrap | null> {
  const { supabase, user } = await requireUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("magam_contact_phone, magam_sync_consent_at")
    .eq("id", user.id)
    .maybeSingle();

  return {
    email: user.email ?? null,
    contactPhone: (data?.magam_contact_phone as string | null)?.trim() || null,
    consentGranted: Boolean(data?.magam_sync_consent_at),
  };
}

export async function saveMagamContactPhone(phone: string): Promise<MagamActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const normalized = normalizeMagamPhone(phone);
  if (normalized.length < 10) return { ok: false, error: "연락처 10자리 이상 입력해 주세요." };

  const { error } = await supabase
    .from("profiles")
    .update({ magam_contact_phone: normalized })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/magam/settings");
  revalidatePath("/magam/write");
  return { ok: true };
}

export async function setMagamSyncConsent(granted: boolean): Promise<MagamActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("profiles")
    .update(
      granted
        ? {
            magam_sync_consent_at: new Date().toISOString(),
            magam_sync_consent_version: MAGAM_SYNC_CONSENT_VERSION,
          }
        : {
            magam_sync_consent_at: null,
            magam_sync_consent_version: null,
          }
    )
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/magam/settings");
  revalidatePath("/magam/write");
  return { ok: true };
}

export async function deleteMagamAccount(): Promise<MagamActionResult> {
  const { user } = await requireUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const service = createServiceSupabase();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
