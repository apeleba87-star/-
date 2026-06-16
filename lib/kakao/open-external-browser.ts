import { detectInAppBrowser, isAndroidUserAgent, isIosUserAgent } from "@/lib/kakao/in-app-browser";

export type OpenExternalBrowserMethod =
  | "kakao-openExternal"
  | "line-scheme"
  | "line-query"
  | "naver-scheme"
  | "android-intent"
  | "window-open"
  | "unsupported";

export type OpenExternalBrowserResult =
  | { ok: true; method: OpenExternalBrowserMethod; detail: string }
  | { ok: false; method: OpenExternalBrowserMethod; detail: string };

export function describeOpenExternalPlan(
  targetUrl: string,
  ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
): { method: OpenExternalBrowserMethod; detail: string } {
  const info = detectInAppBrowser(ua);

  if (info.browserName === "KakaoTalk") {
    return {
      method: "kakao-openExternal",
      detail: `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl).slice(0, 48)}…`,
    };
  }

  if (info.browserName === "LINE") {
    if (isIosUserAgent(ua)) {
      return {
        method: "line-scheme",
        detail: `line://nv/article?url=${encodeURIComponent(targetUrl).slice(0, 48)}…`,
      };
    }
    const joiner = targetUrl.includes("?") ? "&" : "?";
    return {
      method: "line-query",
      detail: `${targetUrl}${joiner}openExternalBrowser=1`,
    };
  }

  if (info.browserName === "Naver" && isIosUserAgent(ua)) {
    return {
      method: "naver-scheme",
      detail: `naversearchapp://open?url=${encodeURIComponent(targetUrl).slice(0, 48)}…`,
    };
  }

  if (isAndroidUserAgent(ua) && info.isInAppBrowser) {
    return {
      method: "android-intent",
      detail: "intent://…#Intent;scheme=https;action=android.intent.action.VIEW;…",
    };
  }

  if (!info.isInAppBrowser) {
    return { method: "window-open", detail: "window.open (일반 브라우저)" };
  }

  return {
    method: "unsupported",
    detail: `${info.browserName ?? "인앱"} — 자동 열기 미지원, URL 복사 안내 필요`,
  };
}

/** 인앱 → 외부 브라우저 열기 시도 (버튼 클릭 핸들러에서 호출) */
export function openInExternalBrowser(targetUrl?: string): OpenExternalBrowserResult {
  if (typeof window === "undefined") {
    return { ok: false, method: "unsupported", detail: "브라우저 환경이 아닙니다." };
  }

  const url = targetUrl?.trim() || window.location.href;
  const ua = navigator.userAgent;
  const info = detectInAppBrowser(ua);
  const plan = describeOpenExternalPlan(url, ua);

  if (plan.method === "unsupported") {
    return { ok: false, method: plan.method, detail: plan.detail };
  }

  try {
    switch (plan.method) {
      case "kakao-openExternal":
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
        break;
      case "line-scheme":
        window.location.href = `line://nv/article?url=${encodeURIComponent(url)}`;
        break;
      case "line-query": {
        const joiner = url.includes("?") ? "&" : "?";
        window.location.href = `${url}${joiner}openExternalBrowser=1`;
        break;
      }
      case "naver-scheme":
        window.location.href = `naversearchapp://open?url=${encodeURIComponent(url)}`;
        break;
      case "android-intent": {
        const path = url.replace(/^https?:\/\//i, "");
        window.location.href =
          `intent://${path}#Intent;scheme=https;action=android.intent.action.VIEW;` +
          `S.browser_fallback_url=${encodeURIComponent(url)};end`;
        break;
      }
      case "window-open":
        window.open(url, "_blank", "noopener,noreferrer");
        break;
      default:
        return { ok: false, method: "unsupported", detail: plan.detail };
    }

    return { ok: true, method: plan.method, detail: plan.detail };
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return { ok: false, method: plan.method, detail: message };
  }
}
