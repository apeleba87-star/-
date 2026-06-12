"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import type { RadarAdInquiryStatus } from "@/lib/demand/radar-ad-inquiry";

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

const STATUSES: RadarAdInquiryStatus[] = ["new", "contacted", "won", "lost"];

export async function updateRadarAdInquiry(
  id: string,
  input: { status?: RadarAdInquiryStatus; admin_note?: string }
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, error: authErr } = await requireStaff();
  if (authErr) return { ok: false, error: authErr };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status)) {
      return { ok: false, error: "잘못된 상태입니다." };
    }
    patch.status = input.status;
  }
  if (input.admin_note !== undefined) {
    patch.admin_note = input.admin_note.trim().slice(0, 4000) || null;
  }

  const { error } = await supabase.from("radar_ad_inquiries").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/radar-ads/inquiries");
  return { ok: true };
}
