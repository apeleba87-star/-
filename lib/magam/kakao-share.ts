import { shareContent } from "@/lib/kakao/share";

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

/** 카카오 인앱 → SDK 채팅방 피커, 그 외 → navigator.share → 복사 */
export async function shareToKakaoTalk(fullText: string): Promise<MagamKakaoShareResult> {
  const url = extractShareUrl(fullText);
  const text = url ? fullText.replace(url, "").trim() : fullText;
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  const outcome = await shareContent({
    text: text || fullText,
    url: shareUrl,
  });

  if (outcome === "cancelled") {
    return { outcome: "failed", truncated: false };
  }

  return { outcome, truncated: false };
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
