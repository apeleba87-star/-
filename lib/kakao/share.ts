import { isKakaoInAppBrowser } from "@/lib/kakao/detect";
import {
  ensureKakaoShareReady,
  getKakaoJavascriptKey,
  kakaoShareFeedSync,
  kakaoShareScrapSync,
} from "@/lib/kakao/sdk";

export type KakaoAwareShareOutcome = "opened" | "copied" | "failed" | "cancelled";

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof document === "undefined") return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

/** 카카오 인앱 → SDK 공유 피커, 그 외 모바일 → navigator.share, 실패 시 복사 */
export async function shareContent(params: {
  title?: string;
  text: string;
  url: string;
}): Promise<KakaoAwareShareOutcome> {
  if (typeof window === "undefined") return "failed";

  const { title, text, url } = params;
  const clipboardText = [title, text, url].filter(Boolean).join("\n");

  if (isKakaoInAppBrowser() && getKakaoJavascriptKey()) {
    const message = [title, text].filter(Boolean).join("\n") || text;
    const feed = {
      title: title?.trim() || message.split("\n")[0]?.trim() || "공유하기",
      description: message.slice(0, 500),
      url,
    };

    if (kakaoShareFeedSync(feed)) return "opened";

    await ensureKakaoShareReady();

    if (kakaoShareFeedSync(feed)) return "opened";
    if (kakaoShareScrapSync(url)) return "opened";
  }

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(
        title ? { title, text, url } : { text, url }
      );
      return "opened";
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return "cancelled";
    }
  }

  const copied = await copyToClipboard(clipboardText);
  return copied ? "copied" : "failed";
}
