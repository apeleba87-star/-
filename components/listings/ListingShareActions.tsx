"use client";

import { useMemo, useState } from "react";
import { Copy, Share2 } from "lucide-react";

type Props = {
  listingId: string;
  title: string;
  regionLabel?: string | null;
  className?: string;
};

function buildShareUrl(listingId: string, channel: string): string {
  if (typeof window === "undefined") return `/s/listings/${listingId}`;
  const url = new URL(`/s/listings/${listingId}`, window.location.origin);
  url.searchParams.set("ref", "listing_share");
  url.searchParams.set("ch", channel);
  return url.toString();
}

export default function ListingShareActions({ listingId, title, regionLabel, className = "" }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shareText = useMemo(() => {
    const meta = regionLabel?.trim() ? `\n지역: ${regionLabel.trim()}` : "";
    return `${title}${meta}\n현장거래 바로가기`;
  }, [title, regionLabel]);

  async function handleNativeShare() {
    setMessage(null);
    setError(null);
    const url = buildShareUrl(listingId, "native");
    try {
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
      const url = buildShareUrl(listingId, "copy");
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setMessage("링크를 복사했습니다.");
    } catch {
      setError("복사에 실패했습니다.");
    }
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/70 p-3 ${className}`}>
      <p className="text-xs font-medium text-slate-700">지인에게 공유해 더 빠르게 거래하세요.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          <Share2 className="h-3.5 w-3.5" />
          공유하기
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Copy className="h-3.5 w-3.5" />
          링크 복사
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
