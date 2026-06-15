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

/** 카카오톡 채팅 링크 → 인앱 브라우저 (여기서 kakaotalk:// 호출 시 Play 스토어 등으로 튐) */
function isKakaoInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK|KAKAO/i.test(navigator.userAgent);
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

function openDeepLinkWithAnchor(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/** 모바일에서 카카오톡 공유 화면 열기 시도 */
function openKakaoSendDeepLink(text: string): void {
  const encoded = encodeURIComponent(text);
  // Android Chrome: intent:// 실패 시 Play 스토어(com.kakao.talk)로 넘어가는 경우가 많음 → kakaotalk:// 우선
  const urls = isAndroidUa()
    ? [
        `kakaotalk://send?text=${encoded}`,
        `kakaolink://send?text=${encoded}`,
        `intent://send?text=${encoded}#Intent;scheme=kakaotalk;package=com.kakao.talk;end`,
      ]
    : [`kakaotalk://send?text=${encoded}`, `kakaolink://send?text=${encoded}`];

  openDeepLinkWithAnchor(urls[0]);
}

async function tryNativeShare(text: string): Promise<"shared" | "cancelled" | "unavailable"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unavailable";
  }
  try {
    await navigator.share({ text });
    return "shared";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "cancelled";
    return "unavailable";
  }
}

/**
 * 카카오톡 공유
 * - 모바일: 앱 공유 화면 열기 + 전체 문구 클립보드
 * - PC: 클립보드 복사 (웹 카톡 앱 연동 불가)
 */
export async function shareToKakaoTalk(fullText: string): Promise<MagamKakaoShareResult> {
  if (typeof window === "undefined") {
    return { outcome: "failed", truncated: false };
  }

  const { text: deepText, truncated } = textForKakaoDeepLink(fullText);

  if (isMobileUa()) {
    const copied = await copyToClipboard(fullText);

    // 카톡 인앱 브라우저: 이미 카톡 안이라 딥링크·공유 시트가 깨짐 → 복사만
    if (isKakaoInAppBrowser()) {
      return copied ? { outcome: "copied", truncated } : { outcome: "failed", truncated };
    }

    const native = await tryNativeShare(fullText);
    if (native === "shared") {
      return { outcome: "opened", truncated };
    }
    if (native === "cancelled" && copied) {
      return { outcome: "copied", truncated };
    }

    openKakaoSendDeepLink(deepText);
    return { outcome: "opened", truncated };
  }

  const copied = await copyToClipboard(fullText);
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
      return truncated
        ? "공유 메뉴 또는 카카오톡에서 채팅방을 선택하세요. 전체 내용은 붙여넣기로 넣을 수 있어요."
        : "공유 메뉴에서 카카오톡을 선택하거나, 카카오톡에서 채팅방을 선택하세요.";
    case "copied":
      return isKakaoInAppBrowser()
        ? "내용이 복사됐어요. 뒤로 가서 붙여넣을 채팅방을 선택해 주세요."
        : "내용이 복사됐어요. 카톡에 붙여넣어 주세요.";
    default:
      return "복사에 실패했습니다. 링크 복사 후 카톡에 붙여넣어 주세요.";
  }
}
