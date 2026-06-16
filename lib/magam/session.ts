import { cache } from "react";

import { createServerSupabase } from "@/lib/supabase-server";

/** 요청당 Supabase·getUser 1회 (페이지 + server action 중복 호출 방지) */
export const getMagamSession = cache(async () => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
