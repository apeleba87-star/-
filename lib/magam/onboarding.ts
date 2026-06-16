const PREFIX = "magam_onboarding_";

export const MAGAM_ONBOARDING_KEYS = {
  carousel: `${PREFIX}carousel_v1`,
  tabs: `${PREFIX}tabs_v1`,
  write: `${PREFIX}write_v1`,
  share: `${PREFIX}share_v1`,
  inAppBanner: `${PREFIX}inapp_banner_v1`,
  pwaInstallBanner: `${PREFIX}pwa_install_banner_v1`,
} as const;

export type MagamOnboardingKey = keyof typeof MAGAM_ONBOARDING_KEYS;

function storageKey(key: MagamOnboardingKey): string {
  return MAGAM_ONBOARDING_KEYS[key];
}

export function isMagamOnboardingDone(key: MagamOnboardingKey): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey(key)) === "1";
  } catch {
    return true;
  }
}

export function markMagamOnboardingDone(key: MagamOnboardingKey): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(key), "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowMagamOnboarding(key: MagamOnboardingKey): boolean {
  return !isMagamOnboardingDone(key);
}
