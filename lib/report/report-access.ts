import { createServerSupabase } from "@/lib/supabase-server";

export type ReportAccessLevel = "free" | "premium";

/** 로그인 사용자는 리포트 전체 열람(무료). 비로그인은 guest 티저만. */
export async function getLoggedInReportAccessLevel(): Promise<ReportAccessLevel> {
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) return "free";

  const { data: profile } = await authSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (role === "admin" || role === "editor") return "premium";

  return "premium";
}
