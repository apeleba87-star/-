import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit } from "@/lib/rate-limit-edge";
import { isDemandAdminOnlyPath } from "@/lib/demand/nav-links";
import {
  MAGAM_AUTH_NEXT_COOKIE,
  MAGAM_DEFAULT_AUTH_NEXT,
  resolveMagamAuthNext,
} from "@/lib/magam/auth-cookie";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 매 요청마다 Supabase 세션을 갱신하고 쿠키를 응답에 반영.
 * 입주레이더 관리자 전용 경로·/api/admin 은 role=admin|editor 만 허용.
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

  if (pathname.startsWith("/api/admin")) {
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin" && profile?.role !== "editor") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    return response;
  }

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
const WRITE_WINDOW_MS = 60 * 60 * 1000; // 1시간
const AUTH_RATE_MAX = 30;
const DEMAND_RATE_MAX = 120;
const API_RATE_MAX = 60;
const WRITE_RATE_MAX = 12; // 문의·지원 등 INSERT
const EVENT_RATE_MAX = 90; // 광고·뷰 이벤트
const HEAVY_GET_RATE_MAX = 20; // 무거운 공개 GET

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function rateLimitBucket(
  pathname: string
): { bucket: string; limit: number; windowMs: number } | null {
  if (pathname === "/login" || pathname === "/signup") {
    return { bucket: "auth", limit: AUTH_RATE_MAX, windowMs: RATE_WINDOW_MS };
  }
  if (
    pathname === "/" ||
    pathname.startsWith("/services/") ||
    pathname.startsWith("/inquiry/") ||
    pathname.startsWith("/guides") ||
    pathname.startsWith("/blog") ||
    pathname === "/search" ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/materials") ||
    pathname.startsWith("/pollution") ||
    pathname.startsWith("/cleaning") ||
    pathname.startsWith("/cases") ||
    pathname.startsWith("/solutions") ||
    pathname.startsWith("/places")
  ) {
    return { bucket: "demand", limit: DEMAND_RATE_MAX, windowMs: RATE_WINDOW_MS };
  }

  // 쓰기·스팸 대상 — 시간당 상한
  if (
    pathname === "/api/inquiry" ||
    pathname === "/api/beta-apply" ||
    pathname === "/api/partners/contact" ||
    pathname === "/api/demand/radar-ads/inquiry"
  ) {
    return { bucket: "write", limit: WRITE_RATE_MAX, windowMs: WRITE_WINDOW_MS };
  }

  // 이벤트 플러딩
  if (
    pathname === "/api/ads/event" ||
    pathname === "/api/demand/radar-ads/event" ||
    pathname === "/api/demand/region-views/event"
  ) {
    return { bucket: "event", limit: EVENT_RATE_MAX, windowMs: RATE_WINDOW_MS };
  }

  // 비용·DB 무거운 GET
  if (
    pathname === "/api/move/budget-candidates" ||
    pathname === "/api/demand/region-scope" ||
    pathname === "/api/test-g2b"
  ) {
    return { bucket: "heavy", limit: HEAVY_GET_RATE_MAX, windowMs: RATE_WINDOW_MS };
  }

  if (pathname.startsWith("/api/")) {
    return { bucket: "api", limit: API_RATE_MAX, windowMs: RATE_WINDOW_MS };
  }
  return null;
}

function rateLimitResponse(retryAfterSec: number): NextResponse {
  return new NextResponse("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", {
    status: 429,
    headers: { "Retry-After": String(retryAfterSec) },
  });
}

function isMagamPwaStaticAsset(pathname: string): boolean {
  if (!pathname.startsWith("/magam/app/")) return false;
  return /\.(?:js|wasm|json|bin|frag|symbols|otf|ttf|woff2?|map)$/i.test(pathname);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (isMagamPwaStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // OAuth code 교환 전 middleware 세션 갱신이 PKCE 쿠키·교환 타이밍을 건드리지 않도록
  if (pathname === "/auth/callback") {
    return NextResponse.next();
  }

  // OAuth PKCE — Site URL(/) 로 떨어진 code 를 /auth/callback 으로 넘김 (마감앱 등 misredirect 대비)
  if (pathname === "/" && req.nextUrl.searchParams.has("code")) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.has("next")) {
      const cookieNext = req.cookies.get(MAGAM_AUTH_NEXT_COOKIE)?.value;
      const magamNext = resolveMagamAuthNext(null, cookieNext);
      url.searchParams.set("next", magamNext ?? "/onboarding");
    }
    return NextResponse.redirect(url);
  }

  if (pathname === "/demand") {
    const url = req.nextUrl.clone();
    url.pathname = "/services/move-in";
    return NextResponse.redirect(url, 301);
  }

  if (pathname.startsWith("/demand/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/services/move-in";
    return NextResponse.redirect(url, 301);
  }

  if (pathname === "/move" || pathname.startsWith("/move/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/services/move-in";
    return NextResponse.redirect(url, 301);
  }

  if (pathname === "/cleanidex" || pathname.startsWith("/cleanidex/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 301);
  }

  if (pathname === "/news") {
    const url = req.nextUrl.clone();
    url.pathname = "/services";
    return NextResponse.redirect(url, 301);
  }

  if (pathname === "/services/pollution" || pathname === "/guides/pollution") {
    const url = req.nextUrl.clone();
    url.pathname = "/guides";
    return NextResponse.redirect(url, 301);
  }

  if (pathname.startsWith("/services/pollution/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/guides/${pathname.slice("/services/pollution/".length)}`;
    return NextResponse.redirect(url, 301);
  }

  const decodedPathname = decodeURIComponent(pathname);
  if (decodedPathname.startsWith("/지역/")) {
    const regionSlug = decodedPathname.slice("/지역/".length);
    if (regionSlug) {
      const url = req.nextUrl.clone();
      url.pathname = `/move/region/${regionSlug}`;
      return NextResponse.rewrite(url);
    }
  }

  const ip = getClientIp(req);
  const limitRule = rateLimitBucket(pathname);

  if (limitRule) {
    const result = await checkRateLimit(
      limitRule.bucket,
      ip,
      limitRule.limit,
      limitRule.windowMs
    );
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
