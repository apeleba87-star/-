"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";

export type CleaningInquiryStatus = "pending" | "contacted" | "closed";

const STATUSES: CleaningInquiryStatus[] = ["pending", "contacted", "closed"];

async function requireStaff() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { supabase, error: "권한이 없습니다." };
  }
  return { supabase, error: null };
}

export async function updateCleaningInquiryStatus(
  id: string,
  status: CleaningInquiryStatus
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, error: authErr } = await requireStaff();
  if (authErr) return { ok: false, error: authErr };
  if (!STATUSES.includes(status)) return { ok: false, error: "잘못된 상태입니다." };

  const { error } = await supabase.from("cleaning_inquiries").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/cleaning-inquiries");
  return { ok: true };
}
