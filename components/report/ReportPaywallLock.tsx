"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Share2 } from "lucide-react";

type Props = {
  postId: string;
  loginReturnPath?: string;
  title: string;
  excerpt?: string | null;
  dateLabel?: string;
};

export default function ReportPaywallLock({ postId, loginReturnPath, title, excerpt, dateLabel }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/report/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(data.message ?? "공유가 완료되었습니다. 새로고침 해 주세요.");
        router.refresh();
      } else {
        setError(data.error ?? "처리하지 못했습니다.");
        if (res.status === 401) setMessage(null);
      }
    } catch {
      setError("요청 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/80 p-8 text-center shadow-lg sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-600">
        <Lock className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
      {dateLabel && (
        <p className="mt-1 text-sm text-slate-500">{dateLabel}</p>
      )}
      {excerpt && (
        <p className="mt-3 line-clamp-3 text-sm text-slate-600">{excerpt}</p>
      )}
      <p className="mt-6 text-slate-600">
        이 콘텐츠는 구독 후 이용할 수 있습니다. 오늘 첫 공유 1회로 당일 다른 리포트까지 같은 날 열람이 이어집니다.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleShare}
          disabled={loading}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-blue-600 bg-white px-6 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
        >
          <Share2 className="h-5 w-5" aria-hidden />
          {loading ? "처리 중…" : "공유하기 (오늘 첫 1회)"}
        </button>
        <Link
          href="/subscribe"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-700"
        >
          구독하기
        </Link>
      </div>
      {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error}
          {error.includes("로그인") && loginReturnPath && (
            <>
              {" "}
              <Link href={`/login?next=${encodeURIComponent(loginReturnPath)}`} className="underline">
                로그인
              </Link>
            </>
          )}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">
        <Link href="/news" className="underline hover:text-slate-700">
          업계 소식 목록
        </Link>
        으로 돌아가기
      </p>
    </div>
  );
}
