"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    router.refresh();
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card text-center">
          <h2 className="text-lg font-semibold text-slate-800">가입 확인 메일을 보냈습니다</h2>
          <p className="mt-2 text-sm text-slate-600">
            {email} 로 확인 링크가 발송되었습니다. 링크를 클릭한 뒤 로그인해 주세요.
          </p>
          <Link href="/login" className="mt-4 inline-block text-blue-600 hover:underline">
            로그인 페이지로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">회원가입</h1>
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
            minLength={6}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "가입 중…" : "가입"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        이미 계정이 있으신가요? <Link href="/login" className="text-blue-600 hover:underline">로그인</Link>
      </p>
    </div>
  );
}
