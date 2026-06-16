import { type NextRequest, NextResponse } from "next/server";
import { magamLoginRedirectPath } from "@/lib/magam/surface";
import {
  MAGAM_AUTH_NEXT_COOKIE,
  isValidMagamAuthNext,
  resolveMagamAuthNext,
} from "@/lib/magam/auth-cookie";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function resolveCallbackNext(
  request: NextRequest,
  explicitNext: string | null
): string {
  const cookieNext = request.cookies.get(MAGAM_AUTH_NEXT_COOKIE)?.value;
  const fromMagam = resolveMagamAuthNext(explicitNext, cookieNext);
  if (fromMagam) return fromMagam;
  if (isValidMagamAuthNext(explicitNext)) return explicitNext!.trim();
  return "/onboarding";
}

function clearMagamAuthCookie(response: NextResponse): void {
  response.cookies.set(MAGAM_AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = resolveCallbackNext(request, searchParams.get("next"));

  if (errorParam) {
    const msg = errorDescription ? `${errorParam}: ${decodeURIComponent(errorDescription)}` : errorParam;
    return NextResponse.redirect(
      new URL(magamLoginRedirectPath(next, msg), request.url)
    );
  }

  let response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 쿠키 스토리지에 세션이 완전히 반영되도록 한 번 더 읽기 (OAuth 직후 RSC/middleware와 타이밍 맞춤)
      await supabase.auth.getUser();
      clearMagamAuthCookie(response);
      return response;
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      await supabase.auth.getUser();
      clearMagamAuthCookie(response);
      return response;
    }
  }

  const failure = NextResponse.redirect(new URL(magamLoginRedirectPath(next, "auth"), request.url));
  clearMagamAuthCookie(failure);
  return failure;
}
