import type { Metadata } from "next";

import MagamKakaoSdkWarmup from "@/components/magam/MagamKakaoSdkWarmup";
import MagamShell from "@/components/magam/MagamShell";
import { MAGAM_APP_NAME } from "@/lib/magam/brand";
import { magamSiteMetadata } from "@/lib/magam/metadata";

const magamRootMeta = magamSiteMetadata("/magam");

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: {
    default: MAGAM_APP_NAME,
    template: `%s | ${MAGAM_APP_NAME}`,
  },
  description: magamRootMeta.description,
  applicationName: MAGAM_APP_NAME,
  openGraph: magamRootMeta.openGraph,
  twitter: magamRootMeta.twitter,
};

export default function MagamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#F2F3F6] text-[#141824] antialiased">
      <MagamKakaoSdkWarmup />
      <MagamShell>{children}</MagamShell>
    </div>
  );
}
