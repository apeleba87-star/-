export type MagamKakaoShareOutcome = "opened" | "copied" | "failed";

export type MagamKakaoShareResult = {
  outcome: MagamKakaoShareOutcome;
  truncated: boolean;
};

function extractShareUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s]+/);
  if (!match) return undefined;
  return match[0].replace(/[)\]}>.,;]+$/, "");
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

/** 단톡방 모집 글 복사 — 클립보드에 전체 문구 복사 */
export async function copyMagamListingMessage(fullText: string): Promise<MagamKakaoShareResult> {
  const copied = await copyToClipboard(fullText);
  return copied ? { outcome: "copied", truncated: false } : { outcome: "failed", truncated: false };
}

/** 마감링크 소개 등 — navigator.share → 복사 */
export async function shareToKakaoTalk(fullText: string): Promise<MagamKakaoShareResult> {
  if (typeof window === "undefined") {
    return { outcome: "failed", truncated: false };
  }

  const url = extractShareUrl(fullText);
  const text = url ? fullText.replace(url, "").trim() : fullText;

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(url ? { text, url } : { text });
      return { outcome: "opened", truncated: false };
    }

    const copied = await copyToClipboard(fullText);
    return copied ? { outcome: "copied", truncated: false } : { outcome: "failed", truncated: false };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { outcome: "failed", truncated: false };
    }

    const copied = await copyToClipboard(fullText);
    return copied ? { outcome: "copied", truncated: false } : { outcome: "failed", truncated: false };
  }
}

export function magamListingCopyToast(outcome: MagamKakaoShareOutcome): string {
  switch (outcome) {
    case "copied":
      return "모집 글을 복사했어요. 카톡 단톡방에 붙여넣으세요.";
    default:
      return "복사에 실패했습니다.";
  }
}

export function magamKakaoShareToast(outcome: MagamKakaoShareOutcome): string {
  switch (outcome) {
    case "opened":
      return "공유가 완료되었습니다.";
    case "copied":
      return "공유 링크를 복사했습니다.";
    default:
      return "공유를 완료하지 못했습니다.";
  }
}
