"use client";

import { useCallback, useEffect, useState } from "react";

import { magamOutlineBtnClass } from "@/components/magam/ui/MagamUi";
import { magamTapClass } from "@/components/magam/ui/MagamTouchNav";
import { detectInAppBrowser } from "@/lib/kakao/in-app-browser";
import { openInExternalBrowser } from "@/lib/kakao/open-external-browser";
import {
  MAGAM_INAPP_BROWSER_BODY,
  MAGAM_INAPP_BROWSER_CONTINUE,
  MAGAM_INAPP_BROWSER_COPY_DONE,
  MAGAM_INAPP_BROWSER_COPY_FALLBACK,
  MAGAM_INAPP_BROWSER_TITLE,
} from "@/lib/magam/copy";
import {
  isMagamOnboardingDone,
  markMagamOnboardingDone,
  type MagamOnboardingKey,
} from "@/lib/magam/onboarding";
import { copyCurrentPageUrl, externalBrowserButtonLabel } from "@/lib/magam/pwa-install";
import { cn } from "@/lib/utils";

const DISMISS_KEY: MagamOnboardingKey = "inAppBanner";

export default function MagamInAppBrowserBanner() {
  const [visible, setVisible] = useState(false);
  const [buttonLabel, setButtonLabel] = useState("브라우저에서 열기");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const inApp = detectInAppBrowser();
    if (!inApp.isInAppBrowser || isMagamOnboardingDone(DISMISS_KEY)) return;
    setButtonLabel(externalBrowserButtonLabel());
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    markMagamOnboardingDone(DISMISS_KEY);
    setVisible(false);
  }, []);

  const handleOpen = useCallback(async () => {
    setNote(null);
    const result = openInExternalBrowser();
    if (!result.ok) {
      const copied = await copyCurrentPageUrl();
      setNote(copied ? MAGAM_INAPP_BROWSER_COPY_DONE : MAGAM_INAPP_BROWSER_COPY_FALLBACK);
    }
  }, []);

  if (!visible) return null;

  return (
    <section className="mb-3 rounded-[18px] border border-[#D6E4FF] bg-[#EEF3FF] p-4">
      <p className="text-[15px] font-bold tracking-[-0.2px] text-[#141824]">{MAGAM_INAPP_BROWSER_TITLE}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#5B6472]">{MAGAM_INAPP_BROWSER_BODY}</p>

      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => void handleOpen()}
          className={cn(magamTapClass, magamOutlineBtnClass, "!border-[#2563EB] !text-[#2563EB]")}
        >
          {buttonLabel}
        </button>
        <button type="button" onClick={dismiss} className="w-full py-2 text-center text-[13px] font-semibold text-[#8B93A1]">
          {MAGAM_INAPP_BROWSER_CONTINUE}
        </button>
      </div>

      {note ? <p className="mt-2 text-center text-[12px] leading-relaxed text-[#5B6472]">{note}</p> : null}
    </section>
  );
}
