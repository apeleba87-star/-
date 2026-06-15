export type MagamKakaoShareOutcome = "opened" | "copied" | "failed";

function isMobileUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroidUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

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

function openDeepLink(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function tryKakaoDeepLinks(text: string): void {
  const encoded = encodeURIComponent(text);
  const urls = isAndroidUa()
    ? [
        `intent://send?text=${encoded}#Intent;scheme=kakaotalk;package=com.kakao.talk;end`,
        `kakaotalk://send?text=${encoded}`,
        `kakaolink://send?text=${encoded}`,
      ]
    : [`kakaotalk://send?text=${encoded}`, `kakaolink://send?text=${encoded}`];

  for (const url of urls) {
    openDeepLink(url);
  }
}

/**
 * 카카오톡 공유 — 웹에서는 항상 클립보드 복사를 보장하고,
 * 모바일이면 공유 시트·딥링크도 시도합니다.
 */
export async function shareToKakaoTalk(text: string): Promise<MagamKakaoShareOutcome> {
  if (typeof window === "undefined") return "failed";

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "opened";
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "AbortError") return "failed";
    }
  }

  const copied = await copyToClipboard(text);

  if (isMobileUa()) {
    tryKakaoDeepLinks(text);
  }

  if (copied) return "copied";
  return "failed";
}

export function magamKakaoShareToast(outcome: MagamKakaoShareOutcome): string {
  switch (outcome) {
    case "opened":
      return "공유 메뉴에서 카카오톡을 선택하세요.";
    case "copied":
      return isMobileUa()
        ? "복사됐어요. 카톡이 열리면 채팅방을 고르고, 안 열리면 붙여넣으세요."
        : "복사됐어요. 카톡에 붙여넣으세요.";
    default:
      return "복사에 실패했습니다. 링크 복사 후 카톡에 붙여넣어 주세요.";
  }
}
