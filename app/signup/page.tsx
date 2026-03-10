"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";
import { checkEmailAvailable, checkNicknameAvailable } from "./actions";

/** 휴대폰 입력: 숫자만 남기고 010-XXXX-XXXX 형식으로 포맷 */
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [emailCheckStatus, setEmailCheckStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [nicknameCheckStatus, setNicknameCheckStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  async function handleCheckEmail() {
    if (!email?.trim()) {
      setError("이메일을 입력한 뒤 확인해 주세요.");
      return;
    }
    setEmailCheckStatus("checking");
    setError(null);
    const result = await checkEmailAvailable(email.trim());
    if (!result.ok) {
      setError(result.error ?? "확인에 실패했습니다.");
      setEmailCheckStatus("idle");
      return;
    }
    setEmailCheckStatus(result.available ? "available" : "taken");
    if (!result.available) setError("이미 사용 중인 이메일입니다.");
  }

  async function handleCheckNickname() {
    if (!nickname?.trim()) {
      setError("별명을 입력한 뒤 확인해 주세요.");
      return;
    }
    setNicknameCheckStatus("checking");
    setError(null);
    const result = await checkNicknameAvailable(nickname.trim());
    if (!result.ok) {
      setError(result.error ?? "확인에 실패했습니다.");
      setNicknameCheckStatus("idle");
      return;
    }
    setNicknameCheckStatus(result.available ? "available" : "taken");
    if (!result.available) setError("이미 사용 중인 별명입니다.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (emailCheckStatus !== "available") {
      setError("이메일 중복 확인을 완료해 주세요. 사용 가능한 이메일이어야 가입할 수 있습니다.");
      return;
    }
    if (nicknameCheckStatus !== "available") {
      setError("별명 중복 확인을 완료해 주세요. 사용 가능한 별명이어야 가입할 수 있습니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: nickname.trim() || undefined,
          phone: phone.trim() || undefined,
        },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card text-center">
          <h2 className="text-lg font-semibold text-slate-800">이메일 확인이 필요합니다</h2>
          <p className="mt-2 text-sm text-slate-600">
            <strong>{email}</strong>로 확인 링크를 보냈습니다. 메일의 링크를 클릭한 뒤에만 로그인할 수 있습니다.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            회원가입 후 바로 로그인되지 않습니다. 반드시 이메일 확인을 완료해 주세요.
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
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailCheckStatus("idle");
              }}
              className="input flex-1"
              placeholder="example@email.com"
              required
            />
            <button
              type="button"
              onClick={handleCheckEmail}
              disabled={emailCheckStatus === "checking"}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {emailCheckStatus === "checking" ? "확인 중…" : "중복 확인"}
            </button>
          </div>
          {emailCheckStatus === "available" && <p className="mt-1 text-xs text-green-600">사용 가능한 이메일입니다.</p>}
          {emailCheckStatus === "taken" && <p className="mt-1 text-xs text-red-600">이미 사용 중인 이메일입니다.</p>}
        </div>

        <div>
          <label className="label">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            minLength={6}
            placeholder="6자 이상"
            required
          />
        </div>
        <div>
          <label className="label">비밀번호 확인</label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="input"
            minLength={6}
            placeholder="비밀번호 다시 입력"
            required
          />
          {passwordConfirm.length > 0 && (
            <>
              {password !== passwordConfirm && (
                <p className="mt-1 text-xs text-red-600">비밀번호가 일치하지 않습니다.</p>
              )}
              {password.length > 0 && password === passwordConfirm && (
                <p className="mt-1 text-xs text-green-600">비밀번호가 일치합니다.</p>
              )}
            </>
          )}
        </div>

        <div>
          <label className="label">별명</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setNicknameCheckStatus("idle");
              }}
              className="input flex-1"
              placeholder=""
              required
            />
            <button
              type="button"
              onClick={handleCheckNickname}
              disabled={nicknameCheckStatus === "checking"}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {nicknameCheckStatus === "checking" ? "확인 중…" : "중복 확인"}
            </button>
          </div>
          {nicknameCheckStatus === "available" && <p className="mt-1 text-xs text-green-600">사용 가능한 별명입니다.</p>}
          {nicknameCheckStatus === "taken" && <p className="mt-1 text-xs text-red-600">이미 사용 중인 별명입니다.</p>}
        </div>

        <div>
          <label className="label">휴대폰</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className="input"
            placeholder="010-0000-0000"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {((emailCheckStatus !== "available" || nicknameCheckStatus !== "available") && !error) && (
          <p className="text-sm text-amber-600">이메일과 별명 모두 중복 확인 후 사용 가능한 경우에만 가입할 수 있습니다.</p>
        )}
        <Button
          type="submit"
          disabled={loading || emailCheckStatus !== "available" || nicknameCheckStatus !== "available"}
          className="w-full"
        >
          {loading ? "가입 중…" : "가입"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        이미 계정이 있으신가요? <Link href="/login" className="text-blue-600 hover:underline">로그인</Link>
      </p>
    </div>
  );
}
