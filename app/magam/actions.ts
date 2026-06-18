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
import {
  MAGAM_MY_CLOSED_PAGE_SIZE,
  MAGAM_MY_OPEN_LISTINGS_LIMIT,
} from "@/lib/magam/my-listings";
import {
  MAGAM_LISTING_CARD_SELECT,
  MAGAM_LISTING_OWNER_SELECT,
} from "@/lib/magam/listing-select";
import { MAGAM_SYNC_CONSENT_VERSION } from "@/lib/magam/copy";
import type { MagamListingRow } from "@/lib/magam/types";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { getMagamSession } from "@/lib/magam/session";

export type MagamWriteBootstrap = {
  contactPhone: string | null;
  alreadyConsented: boolean;
};

export type MagamActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireUser() {
  const { supabase, user } = await getMagamSession();
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
  openListings: MagamListingRow[];
  openHasMore: boolean;
  closedTotal: number;
  closedListingsFirstPage: MagamListingRow[];
}> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return { openListings: [], openHasMore: false, closedTotal: 0, closedListingsFirstPage: [] };
  }

  const [openResult, closedResult] = await Promise.all([
    supabase
      .from("magam_listings")
      .select(MAGAM_LISTING_CARD_SELECT)
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(MAGAM_MY_OPEN_LISTINGS_LIMIT + 1),
    supabase
      .from("magam_listings")
      .select(MAGAM_LISTING_CARD_SELECT, { count: "exact" })
      .eq("user_id", user.id)
      .eq("status", "closed")
      .order("closed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(0, MAGAM_MY_CLOSED_PAGE_SIZE - 1),
  ]);

  const openRows = (openResult.data as MagamListingRow[] | null) ?? [];
  const openHasMore = openRows.length > MAGAM_MY_OPEN_LISTINGS_LIMIT;

  return {
    openListings: openRows.slice(0, MAGAM_MY_OPEN_LISTINGS_LIMIT),
    openHasMore,
    closedTotal: closedResult.count ?? 0,
    closedListingsFirstPage: (closedResult.data as MagamListingRow[] | null) ?? [],
  };
}

export async function getMyMagamClosedListingsPage(page: number): Promise<
  | {
      ok: true;
      listings: MagamListingRow[];
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: string }
> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const safePage = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
  const from = safePage * MAGAM_MY_CLOSED_PAGE_SIZE;
  const to = from + MAGAM_MY_CLOSED_PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("magam_listings")
    .select(MAGAM_LISTING_CARD_SELECT)
    .eq("user_id", user.id)
    .eq("status", "closed")
    .order("closed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return { ok: false, error: "마감 공고를 불러오지 못했습니다." };

  return {
    ok: true,
    listings: (data as MagamListingRow[] | null) ?? [],
    total: 0,
    page: safePage,
    pageSize: MAGAM_MY_CLOSED_PAGE_SIZE,
  };
}

export async function getMagamListingForOwner(id: string): Promise<MagamListingRow | null> {
  const { supabase, user } = await requireUser();
  if (!user) return null;

  const { data } = await supabase
    .from("magam_listings")
    .select(MAGAM_LISTING_OWNER_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as MagamListingRow | null) ?? null;
}

export type CreateMagamListingInput = MagamListingDraft & {
  contactPhone: string;
  linkedServiceDisclosed: boolean;
};

export type UpdateMagamListingInput = CreateMagamListingInput;

function buildMagamListingMutation(input: MagamListingDraft, phone: string, regionGu: string) {
  const draft: MagamListingDraft = input;
  const acceptsNegotiablePrice =
    input.listingType === "trade" ||
    (input.listingType === "hiring" && input.hiringEmploymentType === "full_time") ||
    (input.listingType === "subcontract" && input.subcontractKind === "regular");
  const priceNegotiable = acceptsNegotiablePrice ? Boolean(input.priceNegotiable) : false;
  const isRegularSubcontract = input.listingType === "subcontract" && input.subcontractKind === "regular";

  return {
    listing_type: input.listingType,
    region_gu: regionGu,
    city_id: input.cityId,
    district_slug: input.districtSlug,
    body_text: buildMagamBodyText(draft).trim(),
    contact_phone: phone,
    work_kind: input.listingType === "trade" ? null : input.workKind || null,
    schedule_date:
      input.listingType === "trade" ||
      (input.listingType === "hiring" && input.hiringEmploymentType === "full_time") ||
      isRegularSubcontract
        ? null
        : input.scheduleDate || null,
    time_slot:
      input.listingType === "trade" ||
      (input.listingType === "hiring" && input.hiringEmploymentType === "full_time") ||
      isRegularSubcontract
        ? null
        : input.timeSlot || null,
    pyeong:
      input.listingType === "hiring" || input.listingType === "trade" || input.regularAreaInDetail
        ? null
        : input.pyeong ?? null,
    ac_types: input.listingType === "hiring" || input.listingType === "trade" ? [] : input.acTypes ?? [],
    price_amount: priceNegotiable ? null : input.priceAmount ?? null,
    price_unit: priceNegotiable || input.priceAmount == null ? null : input.priceUnit ?? "man",
    price_negotiable: priceNegotiable,
    hiring_employment_type:
      input.listingType === "hiring" ? input.hiringEmploymentType ?? "daily" : null,
    subcontract_kind:
      input.listingType === "subcontract" ? input.subcontractKind ?? "one_time" : null,
    regular_frequency_count:
      isRegularSubcontract && !input.regularFrequencyNegotiable
        ? input.regularFrequencyCount ?? null
        : null,
    regular_frequency_negotiable:
      isRegularSubcontract ? Boolean(input.regularFrequencyNegotiable) : false,
    regular_area_in_detail:
      isRegularSubcontract ? Boolean(input.regularAreaInDetail) : false,
    price_text: magamPriceText(draft),
    schedule_text: magamScheduleText(draft),
    special_notes: input.specialNotes?.trim() || null,
    trade_side: input.listingType === "trade" ? input.tradeSide ?? null : null,
    trade_client_count: input.listingType === "trade" ? input.tradeClientCount ?? null : null,
    trade_total_revenue: input.listingType === "trade" ? input.tradeTotalRevenue ?? null : null,
    trade_regions_in_detail:
      input.listingType === "trade" ? Boolean(input.tradeRegionsInDetail) : false,
  };
}

function validateMagamListingDraft(input: MagamListingDraft): string | null {
  if (input.listingType === "subcontract" && input.subcontractKind === "regular") {
    if (
      !input.regularFrequencyNegotiable &&
      (input.regularFrequencyCount == null || input.regularFrequencyCount <= 0)
    ) {
      return "정기 주기를 입력하거나 협의를 선택해 주세요.";
    }
    if (!input.workKind) return "청소 대상을 선택해 주세요.";
    if (!input.regularAreaInDetail && (input.pyeong == null || input.pyeong <= 0)) {
      return "면적을 입력하거나 상세 설명 참조를 선택해 주세요.";
    }
    if (!input.priceNegotiable && (input.priceAmount == null || input.priceAmount <= 0)) {
      return "월 도급금을 입력하거나 협의를 선택해 주세요.";
    }
    if (!input.specialNotes?.trim()) return "상세 설명을 입력해 주세요.";
  }

  if (
    input.listingType === "hiring" &&
    input.hiringEmploymentType === "full_time" &&
    !input.priceNegotiable &&
    (input.priceAmount == null || input.priceAmount <= 0)
  ) {
    return "월급을 입력하거나 급여 협의를 선택해 주세요.";
  }

  return null;
}

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
  const draftError = validateMagamListingDraft(draft);
  if (draftError) return { ok: false, error: draftError };

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
    .select("magam_sync_consent_at, magam_suspended_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.magam_suspended_at) {
    return { ok: false, error: "마감링크 이용이 정지된 계정입니다. 고객지원으로 문의해 주세요." };
  }

  const profilePatch: {
    magam_contact_phone: string;
    magam_sync_consent_at?: string;
    magam_sync_consent_version?: string;
  } = { magam_contact_phone: phone };

  if (!profile?.magam_sync_consent_at) {
    profilePatch.magam_sync_consent_at = new Date().toISOString();
    profilePatch.magam_sync_consent_version = MAGAM_SYNC_CONSENT_VERSION;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profilePatch)
    .eq("id", user.id);

  if (profileError) return { ok: false, error: profileError.message };

  const { data, error } = await supabase
    .from("magam_listings")
    .insert({
      user_id: user.id,
      ...buildMagamListingMutation(input, phone, regionGu),
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

export async function updateMagamListing(
  id: string,
  input: UpdateMagamListingInput
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
  const draftError = validateMagamListingDraft(draft);
  if (draftError) return { ok: false, error: draftError };

  const bodyText = buildMagamBodyText(draft);
  if (bodyText.trim().length < 2) {
    return { ok: false, error: "공고 내용을 확인해 주세요." };
  }

  const regionGu = magamRegionDisplayLabel(input.cityId, input.districtSlug);
  if (!regionGu) {
    return { ok: false, error: "지역을 선택해 주세요." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("magam_listings")
    .select("id, listing_type, status, share_slug")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };
  if (!existing) return { ok: false, error: "공고를 찾을 수 없습니다." };
  if (existing.status !== "open") return { ok: false, error: "마감된 공고는 수정할 수 없습니다." };
  if (existing.listing_type !== input.listingType) {
    return { ok: false, error: "공고 종류는 수정할 수 없습니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("magam_suspended_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.magam_suspended_at) {
    return { ok: false, error: "마감링크 이용이 정지된 계정입니다. 고객지원으로 문의해 주세요." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ magam_contact_phone: phone })
    .eq("id", user.id);

  if (profileError) return { ok: false, error: profileError.message };

  const { data, error } = await supabase
    .from("magam_listings")
    .update(buildMagamListingMutation(input, phone, regionGu))
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "open")
    .select("id, share_slug")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "공고를 찾을 수 없습니다." };

  revalidatePath("/magam/live");
  revalidatePath("/magam/me");
  revalidatePath(`/magam/listing/${id}`);
  revalidatePath(`/magam/listing/${id}/edit`);
  revalidatePath(`/p/${data.share_slug}`);

  return { ok: true, data: { id: data.id as string, shareSlug: data.share_slug as string } };
}

export async function closeMagamListing(id: string): Promise<MagamActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("magam_listings")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "open")
    .select("share_slug")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  if (!data) {
    const { data: existing } = await supabase
      .from("magam_listings")
      .select("share_slug, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) return { ok: false, error: "공고를 찾을 수 없습니다." };
    if (existing.status === "closed") return { ok: true };

    return { ok: false, error: "공고를 찾을 수 없습니다." };
  }

  revalidatePath("/magam/live");
  revalidatePath("/magam/me");
  revalidatePath(`/magam/listing/${id}`);
  revalidatePath(`/p/${data.share_slug}`);

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
