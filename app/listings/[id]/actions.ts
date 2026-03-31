"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/**
 * 거래 완료 신고: 관리자 확인 대기로 등록합니다. 관리자 승인 후에만 마감 처리됩니다.
 * 로그인 사용자만 가능. 이미 마감되었거나 이미 대기 중인 신고가 있으면 실패.
 */
export async function reportListingDealCompleted(listingId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: listing } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .single();

  if (!listing) return { ok: false, error: "해당 글이 없습니다." };
  if (listing.status === "closed") return { ok: false, error: "이미 마감된 글입니다." };

  const { data: existingPending } = await supabase
    .from("listing_incidents")
    .select("id")
    .eq("listing_id", listingId)
    .eq("incident_type", "deal_completed")
    .eq("approval_status", "pending")
    .limit(1)
    .maybeSingle();

  if (existingPending)
    return { ok: false, error: "이미 거래 완료로 신고되었습니다. 관리자 확인 대기 중입니다." };

  const { error: insertErr } = await supabase.from("listing_incidents").insert({
    listing_id: listingId,
    reporter_id: user.id,
    incident_type: "deal_completed",
    approval_status: "pending",
    note: "사용자 신고: 거래 완료 (관리자 확인 대기)",
  });

  if (insertErr) return { ok: false, error: insertErr.message };

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  return { ok: true };
}

async function getListingOwnerCheck(listingId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null, listing: null as null, error: "로그인이 필요합니다." };
  const { data: listing } = await supabase
    .from("listings")
    .select("id, user_id, is_external")
    .eq("id", listingId)
    .single();
  if (!listing) return { supabase, user, listing: null as null, error: "해당 글이 없습니다." };
  const isExternal = (listing as { is_external?: boolean }).is_external;
  if (isExternal) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = (profile as { role?: string } | null)?.role;
    if (role !== "admin" && role !== "editor") {
      return { supabase, user, listing, error: "관리자 등록 글은 관리자만 변경할 수 있습니다." };
    }
    return { supabase, user, listing, error: null as string | null };
  }
  if (listing.user_id !== user.id) return { supabase, user, listing, error: "권한이 없습니다." };
  return { supabase, user, listing, error: null as string | null };
}

export async function updateListingVisibility(listingId: string, isPrivate: boolean) {
  const check = await getListingOwnerCheck(listingId);
  if (check.error) return { ok: false, error: check.error };
  const { error } = await check.supabase
    .from("listings")
    .update({ is_private: isPrivate, updated_at: new Date().toISOString() })
    .eq("id", listingId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  return { ok: true };
}

export async function updateListingExpiry(listingId: string, expiresAt: string | null) {
  const check = await getListingOwnerCheck(listingId);
  if (check.error) return { ok: false, error: check.error };
  const value = (expiresAt ?? "").trim();
  const { error } = await check.supabase
    .from("listings")
    .update({ expires_at: value || null, updated_at: new Date().toISOString() })
    .eq("id", listingId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  return { ok: true };
}

export async function softDeleteListing(listingId: string) {
  const check = await getListingOwnerCheck(listingId);
  if (check.error) return { ok: false, error: check.error };
  const { error } = await check.supabase
    .from("listings")
    .update({
      deleted_at: new Date().toISOString(),
      status: "closed",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  return { ok: true };
}
