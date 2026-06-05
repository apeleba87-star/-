import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit } from "@/lib/rate-limit-edge";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 매 요청마다 Supabase 세션을 갱신하고 쿠키를 응답에 반영.
 * 서버 컴포넌트와 클라이언트가 동일한 세션을 보도록 함 (로그인 직후 메뉴 이동 시 재로그인 요구 방지).
 * OAuth 직후 첫 요청에서 sb- 쿠키가 아직 안 붙은 레이스가 있어, 쿠키 유무와 관계없이 getUser()를 호출합니다.
 */
async function updateSession(req: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request: req });

  if (!url || !key) return response;

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

const RATE_WINDOW_MS = 60 * 1000;
const AUTH_RATE_MAX = 30;
const DEMAND_RATE_MAX = 120;
const API_RATE_MAX = 60;

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function rateLimitBucket(pathname: string): { bucket: string; limit: number } | null {
  if (pathname === "/login" || pathname === "/signup") {
    return { bucket: "auth", limit: AUTH_RATE_MAX };
  }
  if (pathname === "/demand" || pathname.startsWith("/demand/")) {
    return { bucket: "demand", limit: DEMAND_RATE_MAX };
  }
  if (pathname.startsWith("/api/")) {
    return { bucket: "api", limit: API_RATE_MAX };
  }
  return null;
}

function rateLimitResponse(retryAfterSec: number): NextResponse {
  return new NextResponse("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", {
    status: 429,
    headers: { "Retry-After": String(retryAfterSec) },
  });
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const ip = getClientIp(req);
  const limitRule = rateLimitBucket(pathname);

  if (limitRule) {
    const result = await checkRateLimit(limitRule.bucket, ip, limitRule.limit, RATE_WINDOW_MS);
    if (!result.allowed) {
      return rateLimitResponse(result.retryAfterSec);
    }
  }

  return updateSession(req);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
