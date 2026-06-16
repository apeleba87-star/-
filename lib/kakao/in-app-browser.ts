export type InAppBrowserInfo = {
  isInAppBrowser: boolean;
  browserName: string | null;
};

const IN_APP_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /KAKAOTALK/i, name: "KakaoTalk" },
  { pattern: /everytime/i, name: "Everytime" },
  { pattern: /NAVER\(inapp|NAVER\//i, name: "Naver" },
  { pattern: /Instagram/i, name: "Instagram" },
  { pattern: /FBAN|FBAV|FB_IAB/i, name: "Facebook" },
  { pattern: /Line\//i, name: "LINE" },
  { pattern: /Twitter|X-Twitter/i, name: "X" },
  { pattern: /; wv\)/i, name: "Android WebView" },
];

export function isAndroidUserAgent(ua: string): boolean {
  return /Android/i.test(ua);
}

export function isIosUserAgent(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

export function detectInAppBrowser(ua = typeof navigator !== "undefined" ? navigator.userAgent : ""): InAppBrowserInfo {
  if (!ua) return { isInAppBrowser: false, browserName: null };

  for (const { pattern, name } of IN_APP_PATTERNS) {
    if (pattern.test(ua)) {
      return { isInAppBrowser: true, browserName: name };
    }
  }

  if (isIosUserAgent(ua) && !/Safari\//i.test(ua)) {
    return { isInAppBrowser: true, browserName: "iOS WebView" };
  }

  return { isInAppBrowser: false, browserName: null };
}
