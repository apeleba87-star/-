import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** 빌드 시 환경변수 없을 때 사용. .from().select() 등 호출 시 빈 결과 반환 */
function createStubClient() {
  const empty = { data: [] as unknown[], error: null as { message: string } | null };
  const chain = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    order: () => chain,
    limit: () => chain,
    not: () => chain,
    eq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    single: () => chain,
    maybeSingle: () => chain,
    then: (resolve: (v: typeof empty) => unknown) => Promise.resolve(resolve(empty)),
  };
  return {
    from: () => chain,
  };
}

/**
 * 서버에서 사용. 인증 없이 공개 데이터만 읽을 때 (RLS에서 anon 허용된 것).
 * 환경변수 없으면 스텁 반환(빌드 통과용, 런타임에는 환경변수 설정 필요).
 */
export function createClient() {
  if (!url || !key) return createStubClient() as unknown as ReturnType<typeof createSupabaseClient>;
  return createSupabaseClient(url, key);
}

/**
 * 서버에서 사용. 쿠키 기반으로 로그인 사용자 세션을 쓰고 싶을 때 (관리자 등).
 * 환경변수 없으면 스텁 반환(빌드 통과용).
 */
export async function createServerSupabase() {
  if (!url || !key) return createStubClient() as unknown as ReturnType<typeof createSupabaseClient>;
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

/**
 * 서버 전용. RLS 무시(service role). cron/구독 갱신 등에서만 사용.
 */
export function createServiceSupabase() {
  if (!url || !serviceKey) throw new Error("Supabase URL and SUPABASE_SERVICE_ROLE_KEY required");
  return createSupabaseClient(url, serviceKey);
}
