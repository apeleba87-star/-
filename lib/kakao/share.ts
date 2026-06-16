import { shareTextIncludesUrl } from "@/lib/magam/share-url";
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

/** 카카오 JS SDK(크롬·모바일 웹) → navigator.share → 클립보드 */
export async function shareContent(params: {
  title?: string;
  text: string;
  url: string;
  /** 본문에 링크가 이미 있으면 url을 다시 붙이지 않음 */
  skipUrlAppend?: boolean;
}): Promise<KakaoAwareShareOutcome> {
  if (typeof window === "undefined") return "failed";

  const { title, text, url, skipUrlAppend = false } = params;
  const hasLink = skipUrlAppend || shareTextIncludesUrl(text, url);
  const clipboardText = hasLink ? text : [text, url].filter(Boolean).join("\n");
  const message = [title, text].filter(Boolean).join("\n") || text;
  const feed = {
    title: title?.trim() || message.split("\n")[0]?.trim() || "공유하기",
    description: message.slice(0, 500),
    url,
  };

  if (getKakaoJavascriptKey()) {
    if (kakaoShareFeedSync(feed)) return "opened";

    await ensureKakaoShareReady();

    if (kakaoShareFeedSync(feed)) return "opened";
    if (kakaoShareScrapSync(url)) return "opened";
  }

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      if (hasLink) {
        await navigator.share(title ? { title, text } : { text });
      } else {
        await navigator.share(title ? { title, text, url } : { text, url });
      }
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
