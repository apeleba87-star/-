"use client";

import { useEffect, useState } from "react";

import MagamPwaInstallGuideDialog from "@/components/magam/MagamPwaInstallGuideDialog";
import { useMagamPwaInstall } from "@/components/magam/useMagamPwaInstall";
import { MAGAM_PWA_INSTALL_CTA, MAGAM_PWA_INSTALL_NATIVE_CTA } from "@/lib/magam/copy";
import { isPwaStandalone } from "@/lib/magam/pwa-install";

export default function MagamPwaInstallSection() {
  const [standalone, setStandalone] = useState(true);
  const { guideOpen, closeGuide, triggerInstall, canNativeInstall } = useMagamPwaInstall();

  useEffect(() => {
    setStandalone(isPwaStandalone());
  }, []);

  if (standalone) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void triggerInstall()}
        className="flex w-full py-3 text-left text-[15px] text-[#141824]"
      >
        {canNativeInstall ? MAGAM_PWA_INSTALL_NATIVE_CTA : MAGAM_PWA_INSTALL_CTA}
        <span className="ml-auto text-[#8B93A1]">›</span>
      </button>
      <MagamPwaInstallGuideDialog open={guideOpen} onClose={closeGuide} />
    </>
  );
}
