import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit } from "@/lib/rate-limit-edge";
import { isDemandAdminOnlyPath } from "@/lib/demand/nav-links";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 매 요청마다 Supabase 세션을 갱신하고 쿠키를 응답에 반영.
 * 입주레이더 관리자 전용 경로는 role=admin 만 허용.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;
  if (isDemandAdminOnlyPath(pathname)) {
    if (!user) {
      const login = new URL("/login", req.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

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
  if (pathname === "/" || pathname.startsWith("/demand/")) {
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

  if (pathname === "/demand") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }

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
