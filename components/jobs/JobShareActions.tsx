"use client";

import { useMemo, useState } from "react";
import { Share2, Copy, MessageCircleMore } from "lucide-react";

type Props = {
  postId: string;
  title: string;
  regionLabel?: string;
  workDate?: string | null;
  className?: string;
  compact?: boolean;
  statsSummary?: string | null;
};

function buildShareUrl(postId: string, channel: string): string {
  if (typeof window === "undefined") return `/jobs/${postId}`;
  const url = new URL(`/jobs/${postId}`, window.location.origin);
  url.searchParams.set("ref", "job_share");
  url.searchParams.set("channel", channel);
  return url.toString();
}

export default function JobShareActions({
  postId,
  title,
  regionLabel,
  workDate,
  className = "",
  compact = false,
  statsSummary,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shareText = useMemo(() => {
    const meta = [regionLabel, workDate ? `작업일 ${workDate}` : null].filter(Boolean).join(" · ");
    return `${title}${meta ? `\n${meta}` : ""}\n지원 바로가기`;
  }, [title, regionLabel, workDate]);

  async function trackShareClick(channel: string) {
    try {
      await fetch("/api/jobs/share-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          event_type: "share_click",
          channel,
          ref: "job_share_actions",
        }),
      });
    } catch {
      // 통계 기록 실패는 UX를 막지 않는다.
    }
  }

  async function handleNativeShare() {
    setMessage(null);
    setError(null);
    const url = buildShareUrl(postId, "native");
    try {
      await trackShareClick("native");
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: shareText, url });
        setMessage("공유가 완료되었습니다.");
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setMessage("공유 링크를 복사했습니다.");
    } catch {
      setError("공유를 완료하지 못했습니다.");
    }
  }

  async function handleCopy() {
    setMessage(null);
    setError(null);
    try {
      await trackShareClick("copy");
      const url = buildShareUrl(postId, "copy");
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setMessage("링크를 복사했습니다.");
    } catch {
      setError("복사에 실패했습니다.");
    }
  }

  function handleSmsShare() {
    void trackShareClick("sms");
    const url = buildShareUrl(postId, "sms");
    const body = encodeURIComponent(`${shareText}\n${url}`);
    if (typeof window !== "undefined") {
      window.open(`sms:?body=${body}`, "_self");
    }
  }

  if (compact) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Share2 className="h-3.5 w-3.5" />
          지원자 더 받기
        </button>
        {message && <p className="mt-1 text-[11px] text-emerald-700">{message}</p>}
        {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/60 p-4 ${className}`}>
      <p className="text-sm font-semibold text-slate-800">지원자 더 받기</p>
      <p className="mt-1 text-xs text-slate-600">카카오/문자/링크 공유로 공고 노출을 늘려보세요.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          <Share2 className="h-3.5 w-3.5" />
          공유하기
        </button>
        <button
          type="button"
          onClick={handleSmsShare}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <MessageCircleMore className="h-3.5 w-3.5" />
          문자 공유
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Copy className="h-3.5 w-3.5" />
          링크 복사
        </button>
      </div>
      {statsSummary && <p className="mt-2 text-xs text-slate-500">{statsSummary}</p>}
      {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

