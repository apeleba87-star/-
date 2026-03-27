import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  let next = searchParams.get("next") ?? "/onboarding";
  if (typeof next !== "string" || next.startsWith("//") || next.startsWith("http://") || next.startsWith("https://") || next.includes("..")) {
    next = "/onboarding";
  }
  if (!next.startsWith("/")) next = "/onboarding";

  if (errorParam) {
    const msg = errorDescription ? `${errorParam}: ${decodeURIComponent(errorDescription)}` : errorParam;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url));
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
      return response;
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", request.url));
}
