import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase-server";

/** Flutter 앱 진입 — 로그인 시 내 공고, 미로그인 시 로그인 */
export default async function MagamRootPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/magam/me");
  redirect("/login?from=magam&next=/magam/me");
}
