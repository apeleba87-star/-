"use client";

import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import {
  buildJobWageShareCopy,
  jobWageShareClipboardText,
  type JobWageSharePreview,
} from "@/lib/report/job-wage-share-copy";
import { cn } from "@/lib/utils";

type Props = {
  preview: JobWageSharePreview;
  className?: string;
};

export default function JobWageReportShareButton({ preview, className }: Props) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = useMemo(() => buildJobWageShareCopy(preview), [preview]);

  async function handleShare() {
    setPending(true);
    setCopied(false);
    const url = typeof window !== "undefined" ? window.location.href.split("#")[0]! : "";
    const clipboard = jobWageShareClipboardText(copy, url);

    try {
      let didCopy = false;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: copy.title, text: copy.message, url });
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(clipboard);
            didCopy = true;
            setCopied(true);
          }
        }
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clipboard);
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
      aria-label="일당 리포트 공유"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md bg-[#FEE500] px-2 text-xs font-semibold text-[#191919] hover:bg-[#F5DC00] active:bg-[#E6CE00] disabled:opacity-60",
        className
      )}
    >
      <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {pending ? "…" : copied ? "복사됨" : "공유"}
    </button>
  );
}
