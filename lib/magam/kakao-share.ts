import { isKakaoInAppBrowser } from "@/lib/kakao/detect";
import {
  ensureKakaoShareReady,
  getKakaoJavascriptKey,
  kakaoShareFeed,
  kakaoShareFeedSync,
  kakaoShareScrapSync,
} from "@/lib/kakao/sdk";
import { shareContent } from "@/lib/kakao/share";
import {
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

function magamFeedTitle(listing: MagamListingRow): string {
  const type = MAGAM_LISTING_TYPE_LABEL[listing.listing_type] ?? listing.listing_type;
  const region = listing.region_gu.trim();
  return region ? `${type} · ${region}` : type;
}

function magamFeedDescription(listing: MagamListingRow, includePhone: boolean, shareUrl: string): string {
  const full = buildMagamShareMessage(listing, shareUrl, includePhone);
  const marker = `\n\n${MAGAM_SHARE_LINK_CTA_BRACKET}`;
  const idx = full.indexOf(marker);
  return (idx >= 0 ? full.slice(0, idx) : full).trim() || full;
}

/** 카카오 인앱 — SDK 피커(상단 노란 버튼과 동일 UI). 그 외 navigator.share → 복사 */
export async function shareMagamListingToKakaoTalk(
  listing: MagamListingRow,
  shareUrl: string,
  includePhone = false
): Promise<MagamKakaoShareResult> {
  const fullText = buildMagamShareMessage(listing, shareUrl, includePhone);

  if (isKakaoInAppBrowser() && getKakaoJavascriptKey()) {
    const feedInput = {
      title: magamFeedTitle(listing),
      description: magamFeedDescription(listing, includePhone, shareUrl),
      url: shareUrl,
      buttonTitle: MAGAM_SHARE_LINK_CTA,
    };

    if (kakaoShareFeedSync(feedInput)) {
      return { outcome: "opened", truncated: false };
    }

    await ensureKakaoShareReady();

    if (kakaoShareFeedSync(feedInput)) {
      return { outcome: "opened", truncated: false };
    }

    if (kakaoShareScrapSync(shareUrl)) {
      return { outcome: "opened", truncated: false };
    }

    const shared = await kakaoShareFeed(feedInput);
    if (shared) {
      return { outcome: "opened", truncated: false };
    }
  }

  return shareToKakaoTalk(fullText);
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
