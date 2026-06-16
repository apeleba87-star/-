import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import {
  MAGAM_AUTH_NEXT_COOKIE,
  isValidMagamAuthNext,
  resolveMagamAuthNext,
} from "@/lib/magam/auth-cookie";
import { magamLoginRedirectPath } from "@/lib/magam/surface";

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

function redirectAfterAuth(request: NextRequest, next: string): NextResponse {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const { origin } = new URL(request.url);

  if (forwardedHost) {
    return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(new URL(next, origin));
}

function authFailureRedirect(request: NextRequest, next: string, message: string): NextResponse {
  const response = NextResponse.redirect(
    new URL(magamLoginRedirectPath(next, encodeURIComponent(message)), request.url)
  );
  clearMagamAuthCookie(response);
  return response;
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
    const msg = errorDescription
      ? `${errorParam}: ${decodeURIComponent(errorDescription)}`
      : errorParam;
    return authFailureRedirect(request, next, msg);
  }

  if (!code && !(token_hash && type)) {
    return authFailureRedirect(request, next, "auth");
  }

  const response = redirectAfterAuth(request, next);
  const cookieStore = await cookies();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            /* Route Handler — cookieStore.set 허용 */
          }
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return authFailureRedirect(request, next, error.message || "auth");
    }
    await supabase.auth.getUser();
    clearMagamAuthCookie(response);
    return response;
  }

  const { error } = await supabase.auth.verifyOtp({ type: type!, token_hash: token_hash! });
  if (error) {
    return authFailureRedirect(request, next, error.message || "auth");
  }
  await supabase.auth.getUser();
  clearMagamAuthCookie(response);
  return response;
}
