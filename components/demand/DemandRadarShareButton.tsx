"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import {
  buildRadarShareCopy,
  buildRadarShareParam,
  buildRadarShareUrl,
} from "@/lib/demand/radar-share";
import type { DemandHeatBand } from "@/lib/demand/district-demand-score";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import { cn } from "@/lib/utils";

type Props = {
  selection: DemandRegionSelection;
  pathLabel: string;
  score: number;
  band: DemandHeatBand;
  jeonseMom?: number;
  moveInIndexMom?: number;
  /** 2+ — 공유 문구에 비교 맥락 (URL·티저는 selection만) */
  compareCount?: number;
  className?: string;
  compact?: boolean;
  /** @deprecated accent 사용 */
  variant?: "default" | "yellow" | "accent";
};

type ShareStatus = "idle" | "shared" | "copied" | "error";

const PILL = {
  default:
    "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800",
  accent:
    "border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-100/80 text-amber-900 hover:border-amber-300 hover:from-amber-100 hover:to-amber-50",
  done: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

export default function DemandRadarShareButton({
  selection,
  pathLabel,
  score,
  band,
  jeonseMom = 0,
  moveInIndexMom = 0,
  compareCount = 1,
  className,
  compact = false,
  variant = "accent",
}: Props) {
  const [status, setStatus] = useState<ShareStatus>("idle");

  const compareMode = compareCount > 1;
  const shareCopy = useMemo(
    () =>
      buildRadarShareCopy({
        selection,
        placeLabel: pathLabel,
        score,
        band,
        jeonseMom,
        moveInIndexMom,
        compareCount,
      }),
    [selection, pathLabel, score, band, jeonseMom, moveInIndexMom, compareCount]
  );
  const shareParam = useMemo(() => buildRadarShareParam(selection), [selection]);
  const shareHint = compareMode ? `${pathLabel} (비교 중 포커스)` : pathLabel;

  const tone = variant === "default" ? "default" : "accent";

  useEffect(() => {
    if (status === "idle") return;
    const t = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(t);
  }, [status]);

  async function shareUrl(channel: string): Promise<string> {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildRadarShareUrl(origin, selection, channel);
  }

  async function handleShare() {
    try {
      const url = await shareUrl("native");
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: shareCopy.title,
          text: shareCopy.message,
          url,
        });
        setStatus("shared");
        return;
      }
      await navigator.clipboard.writeText(`${shareCopy.message}\n${url}`);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  async function handleCopy() {
    try {
      const url = await shareUrl("copy");
      await navigator.clipboard.writeText(`${shareCopy.message}\n${url}`);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  const pillClass = cn(
    "inline-flex items-center justify-center gap-1 rounded-full border font-medium transition-all duration-200 active:scale-[0.97]",
    status === "shared" || status === "copied"
      ? PILL.done
      : status === "error"
        ? PILL.error
        : PILL[tone]
  );

  const compactLabel =
    status === "shared" ? (
      <>
        <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
        공유됨
      </>
    ) : status === "copied" ? (
      <>
        <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
        복사됨
      </>
    ) : status === "error" ? (
      "다시 시도"
    ) : (
      <>
        <Share2 className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2.25} />
        공유
      </>
    );

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleShare}
        title={compareMode ? `${shareHint} 공유` : `${pathLabel} 공유`}
        aria-label={
          compareMode
            ? `${pathLabel} 입주레이더 공유 (${compareCount}개 지역 비교 중)`
            : `${pathLabel} 입주레이더 공유`
        }
        aria-live="polite"
        className={cn(pillClass, "h-8 shrink-0 px-3 text-[11px] tracking-tight", className)}
      >
        {compactLabel}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={handleShare}
        aria-live="polite"
        className={cn(pillClass, "h-8 px-3 text-xs")}
      >
        {compactLabel}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 active:scale-[0.97]",
          status === "copied" && "border-emerald-200 text-emerald-700"
        )}
        title={shareParam}
        aria-label="링크 복사"
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
        링크
      </button>
    </div>
  );
}
