import type { Metadata } from "next";

import { SITE_NAME, defaultDescription } from "@/lib/seo";

export const SITE_PWA_MANIFEST_PATH = "/manifest.webmanifest";

export type SiteWebManifest = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: "standalone";
  orientation: "portrait-primary";
  background_color: string;
  theme_color: string;
  categories: string[];
  lang: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: "any" | "maskable";
  }>;
};

export function siteWebManifest(): SiteWebManifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: defaultDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    categories: ["business", "productivity"],
    lang: "ko",
    icons: [
      {
        src: "/icons/pwa-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

export function sitePwaMetadata(): Pick<Metadata, "applicationName" | "manifest"> {
  return {
    applicationName: SITE_NAME,
    manifest: SITE_PWA_MANIFEST_PATH,
  };
}
