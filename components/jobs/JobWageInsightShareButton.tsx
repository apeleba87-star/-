"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Share2 } from "lucide-react";

/** 입찰 리포트 `ReportShareUnlockButton`과 동일한 지연(ms) */
const COMPLETE_DELAY_MS = 2000;

type Props = {
  reportDate: string;
  shareTitle: string;
  shareText: string;
  loginNextPath: string;
  layout?: "full" | "compact";
  isLoggedIn?: boolean;
};

export default function JobWageInsightShareButton({
  reportDate,
  shareTitle,
  shareText,
  loginNextPath,
  layout = "full",
  isLoggedIn = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeWithRetry(): Promise<boolean> {
    for (let i = 0; i < 3; i += 1) {
      const res = await fetch("/api/report/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_wage_report_date: reportDate }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (data.ok) return true;
      if (i < 2) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
    return false;
  }

  async function handleClick() {
    setLoading(true);
    setError(null);
    const url = typeof window !== "undefined" ? window.location.href : "";
    const payload = `${shareText}\n${url}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text: shareText, url });
        } catch {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(payload);
          } else {
            throw new Error("no_clipboard");
          }
        }
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        setError("이 브라우저에서는 공유 또는 복사를 지원하지 않습니다.");
        setLoading(false);
        return;
      }
    } catch {
      setError("공유가 취소되었거나 완료할 수 없습니다.");
      setLoading(false);
      return;
    }
    await new Promise((r) => setTimeout(r, COMPLETE_DELAY_MS));
    try {
      router.refresh();
      await completeWithRetry();
      router.refresh();
    } catch {
      setError("공유는 완료되었습니다. 잠시 후 새로고침 해 주세요.");
      router.refresh();
    }
    setLoading(false);
  }

  if (layout === "compact") {
    return (
      <div className="rounded-2xl border border-teal-200/90 bg-white/90 p-4 shadow-inner ring-1 ring-teal-100/60">
        <p className="text-sm text-slate-600">
          리포트는 로그인 회원에게 무료로 열려 있습니다.{" "}
          <strong className="font-semibold text-slate-800">팀에 알리려면 아래를 누르세요.</strong>
        </p>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-teal-700 hover:to-emerald-700 disabled:opacity-60 sm:w-auto"
        >
          <Share2 className="h-4 w-4 shrink-0" aria-hidden />
          {loading ? "처리 중…" : "우리 팀 공유"}
        </button>
        {isLoggedIn ? null : (
          <p className="mt-2 text-xs text-slate-500">
            <Link href={`/login?next=${encodeURIComponent(loginNextPath)}`} className="font-medium text-teal-700 underline">
              로그인
            </Link>
            하면 표·심화 인사이트를 무료로 볼 수 있습니다.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-teal-200/90 bg-white/90 p-4 shadow-inner ring-1 ring-teal-100/60">
      <p className="text-sm font-medium text-slate-800">
        표·심화 인사이트는 <strong className="text-slate-900">로그인</strong>하면 무료로 열립니다. 로그인 후 아래에서 팀에 링크를 보낼 수 있습니다.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-teal-700 hover:to-emerald-700 disabled:opacity-60 sm:w-auto"
      >
        <Share2 className="h-4 w-4 shrink-0" aria-hidden />
        {loading ? "처리 중…" : "우리 팀 공유"}
      </button>
      {isLoggedIn ? null : (
        <p className="mt-2 text-xs text-slate-500">
          <Link href={`/login?next=${encodeURIComponent(loginNextPath)}`} className="font-medium text-teal-700 underline">
            로그인
          </Link>
          하면 표·심화 인사이트를 무료로 볼 수 있습니다.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
