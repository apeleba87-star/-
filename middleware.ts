import { NextRequest, NextResponse } from "next/server";

/**
 * 로그인/회원가입 경로 IP별 rate limit (브루트포스·크레덴셜 스터핑 완화).
 * 같은 IP에서 1분당 요청 수 제한. 서버리스에서는 인스턴스별 메모리라 완전한 공유는 아니지만,
 * 동일 인스턴스 내 반복 요청은 차단됨. 프로덕션 다중 인스턴스 시 Upstash Redis 등 연동 권장.
 */
const AUTH_RATE_WINDOW_MS = 60 * 1000; // 1분
const AUTH_RATE_MAX = 30; // 1분당 최대 요청 수 (페이지 로드 + 폼 제출 등)

const authRateStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!isAuthPath(pathname)) return NextResponse.next();

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup"],
};
