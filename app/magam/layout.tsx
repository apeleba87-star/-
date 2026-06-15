import type { Metadata } from "next";

import MagamShell from "@/components/magam/MagamShell";
import { MAGAM_APP_NAME, MAGAM_PRODUCT_NAME } from "@/lib/magam/brand";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: {
    default: MAGAM_APP_NAME,
    template: `%s | ${MAGAM_PRODUCT_NAME}`,
  },
  applicationName: MAGAM_APP_NAME,
  openGraph: {
    siteName: MAGAM_PRODUCT_NAME,
  },
};

export default function MagamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#F2F3F6] text-[#141824] antialiased">
      <MagamShell>{children}</MagamShell>
    </div>
  );
}
