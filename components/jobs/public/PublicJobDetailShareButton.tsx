"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import { buildPublicJobDetailShareMessage } from "@/lib/jobs-public/share-metadata";
import { cn } from "@/lib/utils";

type Props = {
  jobId: string;
  title: string;
  payDisplay: string;
  regionLabel: string;
  company?: string | null;
  className?: string;
};

export default function PublicJobDetailShareButton({
  jobId,
  title,
  payDisplay,
  regionLabel,
  company,
  className,
}: Props) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setPending(true);
    setCopied(false);
    const { title: shareTitle, text, url } = buildPublicJobDetailShareMessage({
      jobId,
      title,
      payDisplay,
      regionLabel,
      company,
    });
    const payload = `${text}\n${url}`;

    try {
      let didCopy = false;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text, url });
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(payload);
            didCopy = true;
            setCopied(true);
          }
        }
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        didCopy = true;
        setCopied(true);
      }
      if (didCopy) {
        window.setTimeout(() => setCopied(false), 2500);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={pending}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md bg-[#FEE500] px-2 text-xs font-semibold text-[#191919] hover:bg-[#F5DC00] active:bg-[#E6CE00] disabled:opacity-60",
        className
      )}
    >
      <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {pending ? "…" : copied ? PUBLIC_JOBS_COPY.shareCopiedCompact : PUBLIC_JOBS_COPY.shareButtonCompact}
    </button>
  );
}
