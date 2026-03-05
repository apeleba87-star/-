import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 서버에서 사용. 인증 없이 공개 데이터만 읽을 때 (RLS에서 anon 허용된 것).
 */
export function createClient() {
  if (!url || !key) throw new Error("Supabase env missing");
  return createSupabaseClient(url, key);
}

/**
 * 서버에서 사용. 쿠키 기반으로 로그인 사용자 세션을 쓰고 싶을 때 (관리자 등).
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}
