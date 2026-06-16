import type { Metadata } from "next";

import {
  MAGAM_APP_NAME,
  MAGAM_APP_TAGLINE,
  MAGAM_PWA_OG_DESCRIPTION,
} from "@/lib/magam/brand";
import { getMagamShareBaseUrl } from "@/lib/magam/share-url";

export const MAGAM_OG_ALT = `${MAGAM_APP_NAME} — ${MAGAM_APP_TAGLINE}`;

/** 마감링크 단독 브랜드 — 클린아이덱스 문구·이미지 없음 */
export function magamSiteMetadata(
  path = "/magam",
  query?: Record<string, string>
): Metadata {
  const base = getMagamShareBaseUrl();
  let url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  if (query && Object.keys(query).length > 0) {
    url += `?${new URLSearchParams(query).toString()}`;
  }

  const ogImage = `${base}/magam/opengraph-image`;

  return {
    title: { absolute: MAGAM_APP_NAME },
    description: MAGAM_PWA_OG_DESCRIPTION,
    applicationName: MAGAM_APP_NAME,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url,
      siteName: MAGAM_APP_NAME,
      title: MAGAM_APP_NAME,
      description: MAGAM_PWA_OG_DESCRIPTION,
      images: [{ url: ogImage, width: 1200, height: 630, alt: MAGAM_OG_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title: MAGAM_APP_NAME,
      description: MAGAM_PWA_OG_DESCRIPTION,
      images: [ogImage],
    },
  };
}

/** 로그인·회원가입 등 ?from=magam 공유 링크 */
export function magamAuthPageMetadata(path: "/login" | "/signup"): Metadata {
  return magamSiteMetadata(path, { from: "magam" });
}
