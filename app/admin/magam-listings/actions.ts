"use server";

import { revalidatePath } from "next/cache";

import { ensureMagamAdmin } from "@/lib/magam/admin-auth";
import { createServiceSupabase } from "@/lib/supabase-server";

type ActionResult = { ok: true } | { ok: false; error: string };

async function serviceOrError() {
  try {
    return { ok: true as const, service: createServiceSupabase() };
  } catch {
    return {
      ok: false as const,
      error: "SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다.",
    };
  }
}

function revalidateMagamListingPaths(listing: { id: string; share_slug: string }) {
  revalidatePath("/admin/magam-listings");
  revalidatePath("/magam/live");
  revalidatePath("/magam/me");
  revalidatePath(`/magam/listing/${listing.id}`);
  revalidatePath(`/p/${listing.share_slug}`);
}

export async function adminCloseMagamListing(
  listingId: string,
  reason?: string
): Promise<ActionResult> {
  const auth = await ensureMagamAdmin();
  if (!auth.ok) return auth;

  const svc = await serviceOrError();
  if (!svc.ok) return svc;

  const { data: listing } = await svc.service
    .from("magam_listings")
    .select("id, share_slug, status")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return { ok: false, error: "공고를 찾을 수 없습니다." };
  if (listing.status === "closed") return { ok: true };

  const note = reason?.trim() || null;
  const { error } = await svc.service
    .from("magam_listings")
    .update({
      status: "closed",
      admin_closed_at: new Date().toISOString(),
      admin_closed_by: auth.userId,
      admin_close_reason: note,
    })
    .eq("id", listingId);

  if (error) return { ok: false, error: error.message };

  await svc.service
    .from("magam_listing_reports")
    .update({
      status: "actioned",
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.userId,
      admin_note: note ?? "운영자 강제 마감",
    })
    .eq("listing_id", listingId)
    .eq("status", "pending");

  revalidateMagamListingPaths(listing);
  return { ok: true };
}

export async function adminDeleteMagamListing(listingId: string): Promise<ActionResult> {
  const auth = await ensureMagamAdmin();
  if (!auth.ok) return auth;

  const svc = await serviceOrError();
  if (!svc.ok) return svc;

  const { data: listing } = await svc.service
    .from("magam_listings")
    .select("id, share_slug")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return { ok: false, error: "공고를 찾을 수 없습니다." };

  const { error } = await svc.service.from("magam_listings").delete().eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidateMagamListingPaths(listing);
  revalidatePath(`/p/${listing.share_slug}`);
  return { ok: true };
}

export async function adminSuspendMagamUser(userId: string): Promise<ActionResult> {
  const auth = await ensureMagamAdmin();
  if (!auth.ok) return auth;

  const svc = await serviceOrError();
  if (!svc.ok) return svc;

  const { error } = await svc.service
    .from("profiles")
    .update({ magam_suspended_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  const { data: openListings } = await svc.service
    .from("magam_listings")
    .select("id, share_slug")
    .eq("user_id", userId)
    .eq("status", "open");

  for (const listing of openListings ?? []) {
    await svc.service
      .from("magam_listings")
      .update({
        status: "closed",
        admin_closed_at: new Date().toISOString(),
        admin_closed_by: auth.userId,
        admin_close_reason: "이용 정지에 따른 운영자 마감",
      })
      .eq("id", listing.id);
    revalidateMagamListingPaths(listing);
  }

  revalidatePath("/admin/magam-listings");
  return { ok: true };
}

export async function adminUnsuspendMagamUser(userId: string): Promise<ActionResult> {
  const auth = await ensureMagamAdmin();
  if (!auth.ok) return auth;

  const svc = await serviceOrError();
  if (!svc.ok) return svc;

  const { data: profile } = await svc.service
    .from("profiles")
    .select("magam_suspended_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.magam_suspended_at) {
    return { ok: false, error: "정지된 계정이 아닙니다." };
  }

  const { error } = await svc.service
    .from("profiles")
    .update({ magam_suspended_at: null })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/magam-listings");
  revalidatePath("/magam/write");
  revalidatePath("/magam/me");
  return { ok: true };
}

export async function adminDismissMagamReport(reportId: string): Promise<ActionResult> {
  const auth = await ensureMagamAdmin();
  if (!auth.ok) return auth;

  const svc = await serviceOrError();
  if (!svc.ok) return svc;

  const { error } = await svc.service
    .from("magam_listing_reports")
    .update({
      status: "dismissed",
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.userId,
    })
    .eq("id", reportId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/magam-listings");
  return { ok: true };
}

export async function adminActionMagamReport(
  reportId: string,
  note?: string
): Promise<ActionResult> {
  const auth = await ensureMagamAdmin();
  if (!auth.ok) return auth;

  const svc = await serviceOrError();
  if (!svc.ok) return svc;

  const { data: report } = await svc.service
    .from("magam_listing_reports")
    .select("id, listing_id, status")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) return { ok: false, error: "신고를 찾을 수 없습니다." };
  if (report.status !== "pending") return { ok: false, error: "이미 처리된 신고입니다." };

  const closeResult = await adminCloseMagamListing(
    report.listing_id,
    note?.trim() || "신고 처리에 따른 운영자 마감"
  );
  if (!closeResult.ok) return closeResult;

  return { ok: true };
}
