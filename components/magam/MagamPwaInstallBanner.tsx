"use client";

import { useEffect, useState } from "react";

import MagamPwaInstallGuideDialog from "@/components/magam/MagamPwaInstallGuideDialog";
import { useMagamPwaInstall } from "@/components/magam/useMagamPwaInstall";
import { magamOutlineBtnClass } from "@/components/magam/ui/MagamUi";
import { magamTapClass } from "@/components/magam/ui/MagamTouchNav";
import { detectInAppBrowser } from "@/lib/kakao/in-app-browser";
import {
  MAGAM_PWA_INSTALL_BANNER_BODY,
  MAGAM_PWA_INSTALL_BANNER_TITLE,
  MAGAM_PWA_INSTALL_CTA,
  MAGAM_PWA_INSTALL_LATER,
  MAGAM_PWA_INSTALL_NATIVE_CTA,
} from "@/lib/magam/copy";
import {
  isMagamOnboardingDone,
  markMagamOnboardingDone,
  type MagamOnboardingKey,
} from "@/lib/magam/onboarding";
import { isPwaStandalone } from "@/lib/magam/pwa-install";
import { cn } from "@/lib/utils";

const DISMISS_KEY: MagamOnboardingKey = "pwaInstallBanner";

export default function MagamPwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const { guideOpen, closeGuide, triggerInstall, canNativeInstall } = useMagamPwaInstall();

  useEffect(() => {
    const inApp = detectInAppBrowser();
    if (inApp.isInAppBrowser || isPwaStandalone() || isMagamOnboardingDone(DISMISS_KEY)) return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    markMagamOnboardingDone(DISMISS_KEY);
    setVisible(false);
  };

  if (!visible) {
    return <MagamPwaInstallGuideDialog open={guideOpen} onClose={closeGuide} />;
  }

  return (
    <>
      <section className="mb-4 rounded-[18px] border border-[#E3E6EC] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <p className="text-[15px] font-bold tracking-[-0.2px] text-[#141824]">{MAGAM_PWA_INSTALL_BANNER_TITLE}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5B6472]">{MAGAM_PWA_INSTALL_BANNER_BODY}</p>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => void triggerInstall()}
            className={cn(magamTapClass, magamOutlineBtnClass, "!border-[#2563EB] !text-[#2563EB]")}
          >
            {canNativeInstall ? MAGAM_PWA_INSTALL_NATIVE_CTA : MAGAM_PWA_INSTALL_CTA}
          </button>
          <button type="button" onClick={dismiss} className="w-full py-2 text-center text-[13px] font-semibold text-[#8B93A1]">
            {MAGAM_PWA_INSTALL_LATER}
          </button>
        </div>
      </section>

      <MagamPwaInstallGuideDialog open={guideOpen} onClose={closeGuide} />
    </>
  );
}
