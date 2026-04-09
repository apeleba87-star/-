"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { refreshHomeContentStats } from "@/lib/content/refresh-home-page-stats";

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, error: "권한이 없습니다." };
  }
  let serviceSupabase;
  try {
    serviceSupabase = createServiceSupabase();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false as const, error: `서버 설정 오류: ${msg}. (SUPABASE_SERVICE_ROLE_KEY 확인)` };
  }
  return { ok: true as const, supabase: serviceSupabase };
}

export type PostActionResult = { ok: true } | { ok: false; error: string };

/** 글 삭제 (관리자만) */
export async function deletePost(postId: string): Promise<PostActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { error } = await auth.supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };
  try {
    await refreshHomeContentStats(auth.supabase);
  } catch {
    /* 무시 */
  }
  revalidatePath("/admin/posts");
  revalidatePath("/news");
  revalidatePath("/categories");
  revalidatePath("/");
  return { ok: true };
}

/** 글 비공개/공개 전환 (관리자만). isPrivate true면 사용자에게 비공개 */
export async function setPostPrivate(postId: string, isPrivate: boolean): Promise<PostActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { error } = await auth.supabase.from("posts").update({ is_private: isPrivate }).eq("id", postId);
  if (error) return { ok: false, error: error.message };
  try {
    await refreshHomeContentStats(auth.supabase);
  } catch {
    /* 무시 */
  }
  revalidatePath("/admin/posts");
  revalidatePath("/news");
  revalidatePath("/categories");
  revalidatePath("/");
  return { ok: true };
}
