import { createServerSupabase } from "@/lib/supabase-server";

/** API 라우트용 — admin/editor만 허용. 실패 시 status와 메시지 */
export async function requireAdminEditorApi(): Promise<
  { ok: true; userId: string } | { ok: false; status: 401 | 403; error: string }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false, status: 403, error: "권한이 없습니다." };
  }
  return { ok: true, userId: user.id };
}

/** 프로덕션에서 디버그 API 차단 (로컬·관리자만) */
export function isDebugApiAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}
