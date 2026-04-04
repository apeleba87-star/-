import type { MetadataRoute } from "next";
import { SITE_NAME, defaultDescription } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
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
    categories: ["business", "news"],
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
