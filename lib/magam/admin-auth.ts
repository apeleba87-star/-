import { createServerSupabase } from "@/lib/supabase-server";

export async function ensureMagamAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || profile?.role === "editor";
  if (!isAdmin) return { ok: false, error: "관리자만 처리할 수 있습니다." };

  return { ok: true, userId: user.id };
}
