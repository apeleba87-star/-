import type { Metadata, Viewport } from "next";

import MagamKakaoSdkWarmup from "@/components/magam/MagamKakaoSdkWarmup";
import MagamShell from "@/components/magam/MagamShell";
import { MAGAM_APP_NAME } from "@/lib/magam/brand";
import { magamSiteMetadata } from "@/lib/magam/metadata";
import { MAGAM_PWA_BG_COLOR, MAGAM_PWA_THEME_COLOR, magamPwaMetadata } from "@/lib/magam/pwa-manifest";

const magamRootMeta = magamSiteMetadata("/magam");

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: {
    default: MAGAM_APP_NAME,
    template: `%s | ${MAGAM_APP_NAME}`,
  },
  description: magamRootMeta.description,
  openGraph: magamRootMeta.openGraph,
  twitter: magamRootMeta.twitter,
  ...magamPwaMetadata(),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: MAGAM_PWA_BG_COLOR },
    { media: "(prefers-color-scheme: dark)", color: MAGAM_PWA_THEME_COLOR },
  ],
};

export default function MagamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#F2F3F6] text-[#141824] antialiased">
      <MagamKakaoSdkWarmup />
      <MagamShell>{children}</MagamShell>
    </div>
  );
}
