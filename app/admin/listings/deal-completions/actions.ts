"use server";

import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin" || profile?.role === "editor";
  if (!isAdmin) return { ok: false as const, error: "관리자만 처리할 수 있습니다." };
  return { ok: true as const };
}

/**
 * 거래 완료 신고 승인: 해당 글을 마감 처리하고 incident를 approved로 변경
 */
export async function approveDealCompletion(incidentId: string) {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  let service;
  try {
    service = createServiceSupabase();
  } catch {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다.",
    };
  }

  const { data: incident } = await service
    .from("listing_incidents")
    .select("id, listing_id, incident_type, approval_status")
    .eq("id", incidentId)
    .single();

  if (!incident || incident.incident_type !== "deal_completed") {
    return { ok: false, error: "해당 신고를 찾을 수 없습니다." };
  }
  if (incident.approval_status !== "pending") {
    return { ok: false, error: "이미 처리된 신고입니다." };
  }

  const { error: updateIncidentErr } = await service
    .from("listing_incidents")
    .update({ approval_status: "approved" })
    .eq("id", incidentId);

  if (updateIncidentErr) return { ok: false, error: updateIncidentErr.message };

  const { error: updateListingErr } = await service
    .from("listings")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", incident.listing_id);

  if (updateListingErr) {
    await service
      .from("listing_incidents")
      .update({ approval_status: "pending" })
      .eq("id", incidentId);
    return { ok: false, error: updateListingErr.message };
  }

  revalidatePath("/admin/listings/deal-completions");
  revalidatePath(`/listings/${incident.listing_id}`);
  revalidatePath("/listings");
  return { ok: true };
}

/**
 * 거래 완료 신고 거절: incident만 rejected로 변경
 */
export async function rejectDealCompletion(incidentId: string) {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  let service;
  try {
    service = createServiceSupabase();
  } catch {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다.",
    };
  }

  const { data: incident } = await service
    .from("listing_incidents")
    .select("id, listing_id, incident_type, approval_status")
    .eq("id", incidentId)
    .single();

  if (!incident || incident.incident_type !== "deal_completed") {
    return { ok: false, error: "해당 신고를 찾을 수 없습니다." };
  }
  if (incident.approval_status !== "pending") {
    return { ok: false, error: "이미 처리된 신고입니다." };
  }

  const { error } = await service
    .from("listing_incidents")
    .update({ approval_status: "rejected" })
    .eq("id", incidentId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/listings/deal-completions");
  revalidatePath(`/listings/${incident.listing_id}`);
  revalidatePath("/listings");
  return { ok: true };
}
