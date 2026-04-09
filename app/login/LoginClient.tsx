"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";

function isValidNext(path: string | null): path is string {
  if (!path || typeof path !== "string") return false;
  const p = path.trim();
  return p.startsWith("/") && !p.startsWith("//");
}

type SocialProvider = "kakao";
const SOCIAL_PROVIDERS: { provider: SocialProvider; label: string; className?: string; sizeClass?: string }[] = [
  {
    provider: "kakao",
    label: "카카오로 로그인",
    className: "border-[#FEE500] bg-[#FEE500] text-[#191919] hover:bg-[#f5d900]",
    sizeClass: "min-h-[52px] py-3.5 text-base font-semibold sm:min-h-[56px] sm:text-lg",
  },
];

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams?.get("next");
  const errorFromUrl = searchParams?.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(errorFromUrl ? decodeURIComponent(errorFromUrl) : null);

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
    router.push(isValidNext(nextUrl) ? nextUrl : "/onboarding");
    router.refresh();
  }

  async function handleOAuth(provider: SocialProvider) {
    setError(null);
    setOauthLoading(provider);
    const supabase = createClient();
    const next = isValidNext(nextUrl) ? nextUrl : "/onboarding";
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` : undefined;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (err) {
      setError(err.message);
      setOauthLoading(null);
      return;
    }
    setOauthLoading(null);
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
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:text-base" role="alert">
              {error}
            </div>
          )}

          <div className="mb-8 space-y-3 sm:space-y-3.5">
            {SOCIAL_PROVIDERS.map(({ provider, label, className, sizeClass }) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleOAuth(provider)}
                disabled={!!oauthLoading}
                className={`w-full rounded-xl border px-4 text-center font-medium transition disabled:opacity-50 ${className} ${sizeClass ?? "min-h-[48px] py-3 text-sm sm:text-base"}`}
              >
                {oauthLoading === provider ? "연결 중…" : label}
              </button>
            ))}
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
            <Button type="submit" disabled={loading} className="w-full min-h-[48px] text-base font-semibold sm:min-h-[52px]">
              {loading ? "로그인 중…" : "로그인"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600 sm:text-base">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
