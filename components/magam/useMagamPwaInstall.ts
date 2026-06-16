"use client";

import { useCallback, useEffect, useState } from "react";

import type { BeforeInstallPromptEvent } from "@/lib/magam/pwa-install";

export function useMagamPwaInstall() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setGuideOpen(true);
  }, [deferredPrompt]);

  const closeGuide = useCallback(() => setGuideOpen(false), []);

  return {
    guideOpen,
    closeGuide,
    triggerInstall,
    canNativeInstall: deferredPrompt != null,
  };
}
