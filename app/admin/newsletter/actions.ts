"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function deleteQueueItem(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role as string | undefined;
  if (role !== "admin" && role !== "editor") return { ok: false, error: "권한이 없습니다." };

  const { error } = await supabase
    .from("newsletter_queue")
    .delete()
    .eq("id", id)
    .is("used_in_issue_id", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/newsletter");
  return { ok: true };
}
