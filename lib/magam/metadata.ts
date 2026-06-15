import type { Metadata } from "next";

import {
  MAGAM_APP_NAME,
  MAGAM_APP_TAGLINE,
  MAGAM_PWA_OG_DESCRIPTION,
} from "@/lib/magam/brand";
import { getMagamShareBaseUrl } from "@/lib/magam/share-url";

/** 마감링크 단독 브랜드 — 클린아이덱스 문구·이미지 없음 */
export function magamSiteMetadata(path = "/magam"): Metadata {
  const base = getMagamShareBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

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
    },
    twitter: {
      card: "summary_large_image",
      title: MAGAM_APP_NAME,
      description: MAGAM_PWA_OG_DESCRIPTION,
    },
  };
}

export const MAGAM_OG_ALT = `${MAGAM_APP_NAME} — ${MAGAM_APP_TAGLINE}`;
