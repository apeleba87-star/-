import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** 빌드 시 환경변수 없을 때 사용. .from().select(), .auth.getUser() 등 호출 시 빈/무효 결과 반환 */
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
    is: () => chain,
    in: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    filter: () => chain,
    match: () => chain,
    or: () => chain,
    contains: () => chain,
    containedBy: () => chain,
    range: () => chain,
    overlaps: () => chain,
    single: () => chain,
    maybeSingle: () => chain,
    then: (resolve: (v: typeof empty) => unknown) => Promise.resolve(resolve(empty)),
  };
  const noUser = { data: { user: null }, error: null };
  return {
    from: () => chain,
    auth: {
      getUser: () => Promise.resolve(noUser),
      getSession: () => Promise.resolve(noUser),
    },
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
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
          });
        } catch {
          // Server Component 등 읽기 전용 컨텍스트에서는 set 불가 — signOut은 Route Handler에서 처리
        }
      },
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
