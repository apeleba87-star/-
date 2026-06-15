export type MagamKakaoShareOutcome = "opened" | "copied" | "failed";

export type MagamKakaoShareResult = {
  outcome: MagamKakaoShareOutcome;
  /** 딥링크용 문구가 잘렸으면 true — 클립보드에 전체 문구 있음 */
  truncated: boolean;
};

/**
 * 카카오 kakaotalk://send?text= 는 인코딩 후 URL 길이·이모지에 매우 민감합니다.
 * 초과 시 채팅방 선택 후 "알 수 없는 이유로 공유 실패"가 납니다.
 */
const KAKAO_ENCODED_MAX = 1200;

function encodedLength(text: string): number {
  return encodeURIComponent(text).length;
}

function stripKakaoUnsafeChars(text: string): string {
  return text
    .replace(/\u{1F447}+/gu, "-----")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\r\n/g, "\n");
}

/** 딥링크에 넣을 짧은 문구 (클립보드는 전체 문구 유지) */
export function textForKakaoDeepLink(fullText: string): { text: string; truncated: boolean } {
  let text = stripKakaoUnsafeChars(fullText.trim());

  if (encodedLength(text) <= KAKAO_ENCODED_MAX) {
    return { text, truncated: false };
  }

  const lines = text.split("\n");
  const linkIndex = lines.findIndex((line) => /cleanidex|\/p\//i.test(line));
  const headEnd = linkIndex > 0 ? Math.min(linkIndex, 5) : Math.min(lines.length, 5);
  const head = lines.slice(0, headEnd).filter(Boolean);
  const tail = linkIndex >= 0 ? lines.slice(linkIndex).filter(Boolean) : lines.slice(-4).filter(Boolean);

  let compact = [...head, "", "(전체 내용은 붙여넣기)", "", ...tail].join("\n");
  compact = stripKakaoUnsafeChars(compact);

  while (encodedLength(compact) > KAKAO_ENCODED_MAX && compact.length > 60) {
    compact = `${compact.slice(0, compact.length - 40).trimEnd()}…`;
  }

  return { text: compact, truncated: true };
}

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

function openKakaoSendDeepLink(text: string): void {
  const encoded = encodeURIComponent(text);
  const url = isAndroidUa()
    ? `intent://send?text=${encoded}#Intent;scheme=kakaotalk;package=com.kakao.talk;end`
    : `kakaotalk://send?text=${encoded}`;
  openDeepLink(url);
}

/**
 * 카카오톡 공유 — 전체 문구는 클립보드에, 딥링크에는 길이 제한 내 문구만 전달.
 */
export async function shareToKakaoTalk(fullText: string): Promise<MagamKakaoShareResult> {
  if (typeof window === "undefined") {
    return { outcome: "failed", truncated: false };
  }

  const copied = await copyToClipboard(fullText);
  const { text: deepText, truncated } = textForKakaoDeepLink(fullText);

  if (isMobileUa()) {
    openKakaoSendDeepLink(deepText);
  }

  if (copied) {
    return { outcome: "copied", truncated };
  }
  return { outcome: "failed", truncated };
}

export function magamKakaoShareToast(
  outcome: MagamKakaoShareOutcome,
  truncated = false
): string {
  switch (outcome) {
    case "opened":
      return "카카오톡에서 공유할 채팅방을 선택하세요.";
    case "copied":
      if (truncated || isMobileUa()) {
        return "전체 내용이 복사됐어요. 카톡에서 채팅방을 고른 뒤 붙여넣어 전송하세요.";
      }
      return "복사됐어요. 카톡에 붙여넣으세요.";
    default:
      return "복사에 실패했습니다. 링크 복사 후 카톡에 붙여넣어 주세요.";
  }
}
