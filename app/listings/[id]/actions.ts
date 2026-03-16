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
