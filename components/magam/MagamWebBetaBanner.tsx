"use client";

import { useEffect, useState } from "react";

import MagamInstallGuideDialog from "@/components/magam/MagamInstallGuideDialog";
import {
  MAGAM_INSTALL_GUIDE_TITLE,
  MAGAM_WEB_BETA_BODY,
  MAGAM_WEB_BETA_TITLE,
} from "@/lib/magam/copy";
import {
  dismissMagamWebBetaBanner,
  isMagamWebBetaBannerDismissed,
} from "@/lib/magam/share-prefs";

function isLocalHost(): boolean {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export default function MagamWebBetaBanner() {
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (isLocalHost()) return;
    setVisible(!isMagamWebBetaBannerDismissed());
  }, []);

  if (!visible) return null;

  return (
    <>
      <div className="mb-4 rounded-xl border border-[#BFDBFE] bg-[#EEF3FF] p-3.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#141824]">{MAGAM_WEB_BETA_TITLE}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5B6472]">{MAGAM_WEB_BETA_BODY}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              dismissMagamWebBetaBanner();
              setVisible(false);
            }}
            className="shrink-0 rounded p-1 text-[#5B6472] hover:bg-white/60"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="mt-2 text-sm font-semibold text-[#2563EB] hover:underline"
        >
          {MAGAM_INSTALL_GUIDE_TITLE}
        </button>
      </div>
      <MagamInstallGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
