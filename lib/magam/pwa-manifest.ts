import type { Metadata } from "next";

import {
  MAGAM_APP_NAME,
  MAGAM_APP_TAGLINE,
  MAGAM_PWA_OG_DESCRIPTION,
} from "@/lib/magam/brand";
import { MAGAM_HUB_PATH } from "@/lib/magam/nav-links";

export const MAGAM_PWA_MANIFEST_PATH = "/magam/manifest.webmanifest";
export const MAGAM_PWA_START_URL = MAGAM_HUB_PATH;
export const MAGAM_PWA_SCOPE = "/magam";
export const MAGAM_PWA_THEME_COLOR = "#1A234E";
export const MAGAM_PWA_BG_COLOR = "#F2F3F6";

const ICON_BASE = "/magam/app/icons";

export type MagamWebManifest = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: "standalone";
  orientation: "portrait-primary";
  theme_color: string;
  background_color: string;
  lang: string;
  prefer_related_applications: boolean;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: "any" | "maskable";
  }>;
};

export function magamWebManifest(): MagamWebManifest {
  return {
    id: MAGAM_PWA_SCOPE,
    name: MAGAM_APP_NAME,
    short_name: MAGAM_APP_NAME,
    description: MAGAM_PWA_OG_DESCRIPTION || MAGAM_APP_TAGLINE,
    start_url: MAGAM_PWA_START_URL,
    scope: MAGAM_PWA_SCOPE,
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: MAGAM_PWA_THEME_COLOR,
    background_color: MAGAM_PWA_BG_COLOR,
    lang: "ko",
    prefer_related_applications: false,
    icons: [
      {
        src: `${ICON_BASE}/Icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${ICON_BASE}/Icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${ICON_BASE}/Icon-maskable-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `${ICON_BASE}/Icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

/** /magam·?from=magam 페이지 head — 클린아이덱스 기본 manifest 대신 마감링크 PWA */
export function magamPwaMetadata(): Pick<
  Metadata,
  "applicationName" | "manifest" | "appleWebApp" | "icons"
> {
  return {
    applicationName: MAGAM_APP_NAME,
    manifest: MAGAM_PWA_MANIFEST_PATH,
    appleWebApp: {
      capable: true,
      title: MAGAM_APP_NAME,
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: `${ICON_BASE}/Icon-192.png`, sizes: "192x192", type: "image/png" },
        { url: `${ICON_BASE}/Icon-512.png`, sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: `${ICON_BASE}/Icon-192.png`, sizes: "192x192", type: "image/png" }],
    },
  };
}
