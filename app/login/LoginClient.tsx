"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import MagamLoginPitch from "@/components/magam/MagamLoginPitch";
import {
  MagamDividerOr,
  MagamErrorBanner,
  MagamFieldLabel,
  MagamSectionCard,
  magamInputClass,
  magamPrimaryBtnClass,
} from "@/components/magam/ui/MagamUi";
import { MAGAM_APP_NAME, isMagamFromQuery } from "@/lib/magam/brand";
import { MAGAM_DEFAULT_AUTH_NEXT, setMagamAuthNextCookie } from "@/lib/magam/auth-cookie";
import { MAGAM_LOGIN_KAKAO_CTA, MAGAM_LOGIN_KAKAO_LOADING } from "@/lib/magam/copy";
import { oauthLoginErrorMessage } from "@/lib/auth/oauth-error-message";
import { createClient } from "@/lib/supabase";

function isValidNext(path: string | null): path is string {
  if (!path || typeof path !== "string") return false;
  const p = path.trim();
  return p.startsWith("/") && !p.startsWith("//");
}

function loginErrorMessage(raw: string | null): string | null {
  return oauthLoginErrorMessage(raw);
}

type SocialProvider = "kakao";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const fromMagam = isMagamFromQuery(searchParams?.get("from"));
  const signupHref = fromMagam ? "/signup?from=magam" : "/signup";
  const nextUrl = searchParams?.get("next");
  const errorFromUrl = searchParams?.get("error");
  const defaultNext = fromMagam ? "/magam/me" : "/onboarding";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(loginErrorMessage(errorFromUrl));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const dest = isValidNext(nextUrl) ? nextUrl : defaultNext;
    window.location.assign(dest);
  }

  async function handleOAuth(provider: SocialProvider) {
    setError(null);
    setOauthLoading(provider);
    const supabase = createClient();
    const next = isValidNext(nextUrl) ? nextUrl : defaultNext;
    if (fromMagam) {
      setMagamAuthNextCookie(next);
    }
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : undefined;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (err) {
      setError(err.message);
      setOauthLoading(null);
    }
  }

  if (fromMagam) {
    const busy = loading || oauthLoading !== null;
    return (
      <div className="min-h-[100dvh] bg-[#F2F3F6] px-4 py-8">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/magam/app/icons/Icon-192.png"
              alt=""
              width={72}
              height={72}
              className="rounded-[18px]"
              priority
            />
            <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.6px] text-[#141824]">
              {MAGAM_APP_NAME}
            </h1>
            <MagamLoginPitch />
          </div>

          <MagamSectionCard className="mt-6" padding="p-5">
            {error ? <MagamErrorBanner message={error} /> : null}
            <button
              type="button"
              onClick={() => handleOAuth("kakao")}
              disabled={busy}
              className="flex min-h-[52px] w-full items-center justify-center rounded-[14px] bg-[#FEE500] text-base font-semibold text-[#191919] disabled:opacity-50"
            >
              {oauthLoading === "kakao" ? MAGAM_LOGIN_KAKAO_LOADING : MAGAM_LOGIN_KAKAO_CTA}
            </button>

            <MagamDividerOr />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <MagamFieldLabel htmlFor="magam-email">이메일</MagamFieldLabel>
                <input
                  id="magam-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={magamInputClass}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <MagamFieldLabel htmlFor="magam-password">비밀번호</MagamFieldLabel>
                <input
                  id="magam-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={magamInputClass}
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" disabled={busy} className={magamPrimaryBtnClass}>
                {loading ? "로그인 중…" : "로그인"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#5B6472]">
              계정이 없으신가요?{" "}
              <Link href={signupHref} className="font-semibold text-[#2563EB] hover:underline">
                회원가입
              </Link>
            </p>
          </MagamSectionCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[min(100vh,920px)] bg-gradient-to-b from-slate-50 to-white px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-xl">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-[1.75rem]">
            로그인
          </h1>
          <p className="mb-8 text-center text-sm text-slate-500 sm:text-base">
            클린아이덱스 계정으로 로그인하세요
          </p>

          {error && (
            <div
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:text-base"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="mb-8 space-y-3 sm:space-y-3.5">
            <button
              type="button"
              onClick={() => handleOAuth("kakao")}
              disabled={!!oauthLoading}
              className="w-full min-h-[52px] rounded-xl border border-[#FEE500] bg-[#FEE500] px-4 text-center text-base font-semibold text-[#191919] transition hover:bg-[#f5d900] disabled:opacity-50"
            >
              {oauthLoading === "kakao" ? "연결 중…" : "카카오로 로그인"}
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="bg-white px-3 text-slate-500">또는</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div>
              <label className="label text-sm sm:text-base">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input min-h-[48px] text-base sm:min-h-[52px]"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="label text-sm sm:text-base">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input min-h-[48px] text-base sm:min-h-[52px]"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-slate-900 text-base font-semibold text-white sm:min-h-[52px] disabled:opacity-50"
            >
              {loading ? "로그인 중…" : "로그인"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600 sm:text-base">
            계정이 없으신가요?{" "}
            <Link href={signupHref} className="font-medium text-blue-600 hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
