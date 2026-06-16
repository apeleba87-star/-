import { shareContent } from "@/lib/kakao/share";
import {
  ensureKakaoShareReady,
  getKakaoJavascriptKey,
  kakaoShareFeed,
  kakaoShareFeedSync,
  kakaoShareScrapSync,
} from "@/lib/kakao/sdk";
import {
  MAGAM_GROUP_CHAT_COPY_DONE,
  MAGAM_GROUP_CHAT_COPY_FAILED,
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_SHARE_LINK_CTA,
  MAGAM_SHARE_LINK_CTA_BRACKET,
} from "@/lib/magam/copy";
import { buildMagamShareMessage } from "@/lib/magam/share-format";
import type { MagamListingRow } from "@/lib/magam/types";

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

function magamFeedTitle(listing: MagamListingRow): string {
  const type = MAGAM_LISTING_TYPE_LABEL[listing.listing_type] ?? listing.listing_type;
  const region = listing.region_gu.trim();
  return region ? `${type} · ${region}` : type;
}

function magamFeedDescription(
  listing: MagamListingRow,
  includePhone: boolean,
  shareUrl: string
): string {
  const full = buildMagamShareMessage(listing, shareUrl, includePhone);
  const marker = `\n\n${MAGAM_SHARE_LINK_CTA_BRACKET}`;
  const idx = full.indexOf(marker);
  return (idx >= 0 ? full.slice(0, idx) : full).trim() || full;
}

async function tryKakaoSdkListingShare(
  listing: MagamListingRow,
  shareUrl: string,
  includePhone: boolean
): Promise<boolean> {
  if (!getKakaoJavascriptKey()) return false;

  const feedInput = {
    title: magamFeedTitle(listing),
    description: magamFeedDescription(listing, includePhone, shareUrl),
    url: shareUrl,
    buttonTitle: MAGAM_SHARE_LINK_CTA,
  };

  if (kakaoShareFeedSync(feedInput)) return true;

  await ensureKakaoShareReady();

  if (kakaoShareFeedSync(feedInput)) return true;
  if (kakaoShareScrapSync(shareUrl)) return true;

  return kakaoShareFeed(feedInput);
}

/** 공고 공유 — 카카오 SDK 피커(크롬·모바일) → navigator.share → 클립보드 */
export async function shareMagamListingToKakaoTalk(
  listing: MagamListingRow,
  shareUrl: string,
  includePhone = false
): Promise<MagamKakaoShareResult> {
  const fullText = buildMagamShareMessage(listing, shareUrl, includePhone);

  if (await tryKakaoSdkListingShare(listing, shareUrl, includePhone)) {
    return { outcome: "opened", truncated: false };
  }

  return shareToKakaoTalk(fullText);
}

/** 단톡방 모집 글 — SDK 실패 시 클립보드만 */
export async function copyMagamListingMessage(fullText: string): Promise<MagamKakaoShareResult> {
  if (typeof window === "undefined") {
    return { outcome: "failed", truncated: false };
  }

  const copied = await copyToClipboard(fullText);
  return copied ? { outcome: "copied", truncated: false } : { outcome: "failed", truncated: false };
}

/** 마감링크 소개 등 — 카카오 SDK → navigator.share → 복사 */
export async function shareToKakaoTalk(fullText: string): Promise<MagamKakaoShareResult> {
  if (typeof window === "undefined") {
    return { outcome: "failed", truncated: false };
  }

  const url = extractShareUrl(fullText);
  const text = url ? fullText.replace(url, "").trim() : fullText;
  const shareUrl = url ?? window.location.href;

  const outcome = await shareContent({
    text: text || fullText,
    url: shareUrl,
  });

  if (outcome === "cancelled") {
    return { outcome: "failed", truncated: false };
  }

  return { outcome, truncated: false };
}

export function magamListingShareToast(outcome: MagamKakaoShareOutcome): string {
  switch (outcome) {
    case "opened":
      return "카카오톡 공유 창을 열었습니다.";
    case "copied":
      return MAGAM_GROUP_CHAT_COPY_DONE;
    default:
      return MAGAM_GROUP_CHAT_COPY_FAILED;
  }
}

export function magamListingCopyToast(outcome: MagamKakaoShareOutcome): string {
  return magamListingShareToast(outcome);
}

export function magamKakaoShareToast(outcome: MagamKakaoShareOutcome): string {
  switch (outcome) {
    case "opened":
      return "카카오톡 공유 창을 열었습니다.";
    case "copied":
      return "공유 링크를 복사했습니다.";
    default:
      return "공유를 완료하지 못했습니다.";
  }
}

export { ensureKakaoShareReady };
