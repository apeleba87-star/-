"use client";

import { useCallback, useState } from "react";

import {
  buildMagamIntroAfterCloseCopy,
  buildMagamIntroCopy,
} from "@/lib/magam/viral-copy";

type Variant = "intro" | "afterClose";

type Props = {
  variant?: Variant;
  className?: string;
};

export default function MagamReferralCopyButton({
  variant = "intro",
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);

  const label =
    variant === "afterClose" ? "동료에게 소개 (문구 복사)" : "동료에게 알리기 (문구 복사)";

  const onCopy = useCallback(async () => {
    const text =
      variant === "afterClose"
        ? buildMagamIntroAfterCloseCopy()
        : buildMagamIntroCopy();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      window.prompt("아래 문구를 복사해 카톡에 붙여넣으세요.", text);
    }
  }, [variant]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 ${className}`}
    >
      <span aria-hidden>{copied ? "✓" : "📋"}</span>
      {copied ? "복사됐어요 · 카톡에 붙여넣기" : label}
    </button>
  );
}
