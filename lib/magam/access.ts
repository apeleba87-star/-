import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase-server";

async function resolveMagamAdmin(): Promise<boolean> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

/** 실시간 모집 목록 — 공개 */
export const isMagamAdmin = cache(resolveMagamAdmin);
