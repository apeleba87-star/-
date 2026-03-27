"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { SHARED_RANDOM_PANEL_COUNT } from "@/lib/report/share-unlock-panels";

/** 견적 계산기 분석 모달과 동일한 복귀 후 대기(ms) — 필요 시 한곳에서 조정 */
export const REPORT_SHARE_COMPLETE_DELAY_MS = 2000;

type Props = {
  postId: string;
  shareTitle: string;
  shareText: string;
};

export default function ReportShareUnlockButton({ postId, shareTitle, shareText }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeShareFlow() {
    const res = await fetch("/api/report/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!data.ok) {
      setError(data.error ?? "처리하지 못했습니다.");
      return;
    }
    router.refresh();
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
    await new Promise((r) => setTimeout(r, REPORT_SHARE_COMPLETE_DELAY_MS));
    try {
      await completeShareFlow();
    } catch {
      setError("서버 요청 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-white/80 p-4 shadow-inner backdrop-blur-sm">
      <p className="text-sm font-medium text-slate-800">
        오늘 1회 공유 시 이 리포트에서{" "}
        <span className="text-violet-700">심화 패널 {SHARED_RANDOM_PANEL_COUNT}종</span>이 무작위로 열립니다. (하루 한 리포트만)
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 sm:w-auto"
      >
        <Share2 className="h-4 w-4 shrink-0" aria-hidden />
        {loading ? "처리 중…" : `공유하고 심화 ${SHARED_RANDOM_PANEL_COUNT}종 열기`}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
