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

/** 공유 본문에 공개 링크가 이미 포함됐는지 (짧은 host/path 형식 포함) */
export function shareTextIncludesUrl(text: string, url: string): boolean {
  if (!text || !url) return false;
  if (text.includes(url)) return true;

  try {
    const u = new URL(url);
    const path = u.pathname;
    if (!text.includes(path)) return false;

    const host = u.hostname.toLowerCase();
    const bareHost = host.replace(/^www\./i, "");
    const candidates = [
      `${host}${path}`,
      `${bareHost}${path}`,
      `www.${bareHost}${path}`,
      path,
    ];
    return candidates.some((c) => text.includes(c));
  } catch {
    return false;
  }
}

/** 공유 문구 끝의 링크 추출 (https·www.host/path) */
export function extractUrlFromShareText(text: string): string | undefined {
  const httpsMatch = text.match(/https?:\/\/[^\s]+/);
  if (httpsMatch) {
    return httpsMatch[0].replace(/[)\]}>.,;]+$/, "");
  }

  const lineMatch = text.match(
    /(?:^|\n)((?:www\.)?[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(?:\/[^\s]*)?)\s*$/im
  );
  if (!lineMatch?.[1]) return undefined;

  const hostPath = lineMatch[1].replace(/[)\]}>.,;]+$/, "");
  return hostPath.startsWith("http") ? hostPath : `https://${hostPath}`;
}
