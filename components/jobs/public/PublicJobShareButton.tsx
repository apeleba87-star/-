"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import type { JobPublicRegionDraft } from "@/lib/jobs-public/job-region-scope";
import { buildPublicJobsShareMessage } from "@/lib/jobs-public/share-metadata";
import type { JobPublicRegionPreference } from "@/lib/jobs-public/region-preference-shared";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import { parsePublicJobSort } from "@/lib/jobs-public/public-job-sort";
import { cn } from "@/lib/utils";

type Props = {
  draft: JobPublicRegionDraft;
  pref: JobPublicRegionPreference;
  localPay: PublicJobOpeningListItem | null;
  nationalPay: PublicJobOpeningListItem | null;
  localCount: number;
  className?: string;
};

export default function PublicJobShareButton({
  draft,
  pref,
  localPay,
  nationalPay,
  localCount,
  className,
}: Props) {
  const searchParams = useSearchParams();
  const sort = parsePublicJobSort(searchParams?.get("sort"));
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setPending(true);
    setCopied(false);
    const { title, text, url } = buildPublicJobsShareMessage({
      draft,
      pref,
      localPay,
      nationalPay,
      localCount,
      sort,
    });
    const payload = `${text}\n${url}`;

    try {
      let didCopy = false;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text, url });
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
        "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-4 text-base font-semibold text-blue-900 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50",
        className
      )}
    >
      <Share2 className="h-5 w-5 shrink-0" aria-hidden />
      {pending
        ? PUBLIC_JOBS_COPY.sharePending
        : copied
          ? PUBLIC_JOBS_COPY.shareCopied
          : PUBLIC_JOBS_COPY.shareButton}
    </button>
  );
}
