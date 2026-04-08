import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 매 요청마다 Supabase 세션을 갱신하고 쿠키를 응답에 반영.
 * 서버 컴포넌트와 클라이언트가 동일한 세션을 보도록 함 (로그인 직후 메뉴 이동 시 재로그인 요구 방지).
 */
function hasSupabaseAuthCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

async function updateSession(req: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request: req });

  if (!url || !key) return response;

  if (!hasSupabaseAuthCookie(req)) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
        });
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as Parameters<NextResponse["cookies"]["set"]>[2] ?? {});
        });
      },
    },
  });

  // getUser() triggers token revalidation/refresh more reliably than getSession()
  // and helps avoid intermittent "logged out right after OAuth redirect" cases.
  await supabase.auth.getUser();
  return response;
}

/**
 * 로그인/회원가입 경로 IP별 rate limit (브루트포스·크레덴셜 스터핑 완화).
 */
const AUTH_RATE_WINDOW_MS = 60 * 1000; // 1분
const AUTH_RATE_MAX = 30; // 1분당 최대 요청 수

const authRateStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const response = await updateSession(req);

  if (isAuthPath(pathname)) {
    const ip = getClientIp(req);
    const now = Date.now();
    let entry = authRateStore.get(ip);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + AUTH_RATE_WINDOW_MS };
      authRateStore.set(ip, entry);
    }
    entry.count += 1;

    if (entry.count > AUTH_RATE_MAX) {
      return new NextResponse(
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
