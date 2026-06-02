import { createServerSupabase } from "@/lib/supabase-server";

/** 입주수요 탐색 서브메뉴(TOP10·비교 등) — 관리자 전용 */
export async function isDemandAdmin(): Promise<boolean> {
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
