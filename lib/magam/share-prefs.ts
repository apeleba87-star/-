const INCLUDE_PHONE_KEY = "magam_kakao_share_include_phone_v1";
const BETA_BANNER_KEY = "magam_web_beta_banner_dismissed_v1";

export function loadMagamShareIncludePhone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INCLUDE_PHONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveMagamShareIncludePhone(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INCLUDE_PHONE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function isMagamWebBetaBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BETA_BANNER_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissMagamWebBetaBanner(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BETA_BANNER_KEY, "1");
  } catch {
    /* ignore */
  }
}
