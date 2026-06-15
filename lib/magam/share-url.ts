/** 카톡 공유용 공개 URL (웹) */

const MAGAM_SHARE_BASE_DEFAULT = "https://cleanidex.co.kr";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** 카톡·추천 문구에 넣을 공개 베이스 URL (localhost 제외) */
export function getMagamShareBaseUrl(browserOrigin?: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_MAGAM_SHARE_BASE_URL?.trim() ||
    process.env.MAGAM_SHARE_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const origin =
    browserOrigin ?? (typeof window !== "undefined" ? window.location.origin : "");
  if (origin) {
    try {
      const { hostname } = new URL(origin);
      if (!isLocalHostname(hostname)) {
        return origin.replace(/\/+$/, "");
      }
    } catch {
      /* ignore */
    }
  }

  return MAGAM_SHARE_BASE_DEFAULT;
}

/** 카톡 공유용 공개 URL (웹) */
export function buildMagamShareUrl(shareSlug: string): string {
  return `${getMagamShareBaseUrl()}/p/${shareSlug}`;
}
