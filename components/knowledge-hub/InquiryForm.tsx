"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

type Props = {
  inquiryType: "regular" | "move_in";
  title: string;
  description: string;
};

export default function InquiryForm({ inquiryType, title, description }: Props) {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";
  const refPath = searchParams.get("path") ?? "";

  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inquiry_type: inquiryType,
        service_slug: ref || null,
        region,
        phone,
        message,
        ref_slug: ref,
        ref_path: refPath,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setStatus("error");
      setError(json.error ?? "제출에 실패했습니다.");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-center">
        <p className="text-lg font-bold text-teal-900">문의가 접수되었습니다.</p>
        <p className="mt-2 text-sm text-teal-800">빠른 시일 내에 연락드리겠습니다.</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-base text-slate-600">{description}</p>
      </div>
      <label className="block">
        <span className="text-sm font-bold text-slate-700">지역 (시·구)</span>
        <input
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="mt-1 w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-base"
          placeholder="예: 서울 강서구"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-slate-700">연락처</span>
        <input
          required
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-base"
          placeholder="010-0000-0000"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-slate-700">추가 내용 (선택)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base"
          placeholder="평수, 희망 일정, 청소 주기 등"
        />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "loading"}
        className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-teal-600 px-5 py-3 text-base font-black text-white disabled:opacity-60"
      >
        {status === "loading" ? "제출 중…" : "견적 문의하기"}
      </button>
    </form>
  );
}
