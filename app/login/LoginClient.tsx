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

type SocialProvider = "google" | "naver" | "kakao";
const SOCIAL_PROVIDERS: { provider: SocialProvider; label: string; className?: string }[] = [
  { provider: "google", label: "Google로 로그인", className: "border-slate-300 bg-white text-slate-800 hover:bg-slate-50" },
  { provider: "naver", label: "네이버로 로그인", className: "border-[#03C75A] bg-[#03C75A] text-white hover:bg-[#02b350]" },
  { provider: "kakao", label: "카카오로 로그인", className: "border-[#FEE500] bg-[#FEE500] text-[#191919] hover:bg-[#f5d900]" },
];

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams?.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      provider: provider as "google",
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
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">로그인</h1>

      <div className="mb-6 space-y-2">
        {SOCIAL_PROVIDERS.map(({ provider, label, className }) => (
          <button
            key={provider}
            type="button"
            onClick={() => handleOAuth(provider)}
            disabled={!!oauthLoading}
            className={`w-full rounded-lg border px-4 py-2.5 text-center text-sm font-medium transition disabled:opacity-50 ${className}`}
          >
            {oauthLoading === provider ? "연결 중…" : label}
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-500">또는</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "로그인 중…" : "로그인"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        계정이 없으신가요? <Link href="/signup" className="text-blue-600 hover:underline">회원가입</Link>
      </p>
    </div>
  );
}
