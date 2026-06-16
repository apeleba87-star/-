"use client";

import { useEffect, useState } from "react";

import {
  markMagamOnboardingDone,
  shouldShowMagamOnboarding,
} from "@/lib/magam/onboarding";

type Props = {
  enabled?: boolean;
};

export default function MagamTabHints({ enabled = true }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!shouldShowMagamOnboarding("tabs")) return;
    if (shouldShowMagamOnboarding("carousel")) return;
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, [enabled]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => {
      markMagamOnboardingDone("tabs");
      setVisible(false);
    }, 4500);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] z-30 px-4">
      <p className="mx-auto max-w-lg rounded-[12px] bg-[#141824] px-4 py-2.5 text-center text-[12px] font-semibold leading-snug text-white shadow-lg">
        하단 탭 — <span className="text-[#FEE500]">내 공고</span> ·{" "}
        <span className="text-[#FEE500]">글쓰기</span> · 설정
      </p>
    </div>
  );
}
