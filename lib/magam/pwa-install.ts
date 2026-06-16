import { isAndroidUserAgent, isIosUserAgent } from "@/lib/kakao/in-app-browser";

/** Chrome `beforeinstallprompt` (비표준) */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function externalBrowserButtonLabel(ua = typeof navigator !== "undefined" ? navigator.userAgent : ""): string {
  if (isIosUserAgent(ua)) return "Safari에서 열기";
  if (isAndroidUserAgent(ua)) return "Chrome에서 열기";
  return "브라우저에서 열기";
}

export async function copyCurrentPageUrl(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch {
    return false;
  }
}
