"use client";

import { useCallback, useState } from "react";

import { magamOutlineBtnClass } from "@/components/magam/ui/MagamUi";
import {
  MAGAM_REFERRAL_KAKAO_AFTER_CLOSE,
  MAGAM_REFERRAL_KAKAO_LABEL,
} from "@/lib/magam/copy";
import { magamKakaoShareToast, shareToKakaoTalk } from "@/lib/magam/kakao-share";
import {
  buildMagamIntroAfterCloseCopy,
  buildMagamIntroCopy,
} from "@/lib/magam/viral-copy";
import { cn } from "@/lib/utils";

type Variant = "intro" | "afterClose";

type Props = {
  variant?: Variant;
  className?: string;
  /** 부모에서 토스트를 띄울 때 (공유 블록 등) */
  onNotify?: (message: string) => void;
  /** false면 자체 토스트 숨김 */
  showToast?: boolean;
};

export default function MagamReferralCopyButton({
  variant = "intro",
  className = "",
  onNotify,
  showToast = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const label =
    variant === "afterClose" ? MAGAM_REFERRAL_KAKAO_AFTER_CLOSE : MAGAM_REFERRAL_KAKAO_LABEL;

  const notify = useCallback(
    (message: string) => {
      if (onNotify) {
        onNotify(message);
        return;
      }
      if (!showToast) return;
      setToast(message);
      window.setTimeout(() => setToast(null), 4000);
    },
    [onNotify, showToast]
  );

  const onShare = useCallback(async () => {
    setLoading(true);
    const siteBase =
      typeof window !== "undefined" ? window.location.origin : "https://cleanidex.co.kr";
    const text =
      variant === "afterClose"
        ? buildMagamIntroAfterCloseCopy(siteBase)
        : buildMagamIntroCopy(siteBase);
    const outcome = await shareToKakaoTalk(text);
    setLoading(false);
    notify(magamKakaoShareToast(outcome));
    if (outcome === "failed") {
      window.prompt("아래 문구를 복사해 카톡에 붙여넣으세요.", text);
    }
  }, [variant, notify]);

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={onShare}
        disabled={loading}
        className={cn(magamOutlineBtnClass, "gap-2 text-[15px]")}
      >
        <span aria-hidden className="text-base">
          {loading ? "…" : "💬"}
        </span>
        {loading ? "카카오톡 여는 중…" : label}
      </button>
      {!onNotify && showToast && toast ? (
        <p className="rounded-[10px] bg-[#141824] px-3 py-2 text-center text-xs text-white">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
