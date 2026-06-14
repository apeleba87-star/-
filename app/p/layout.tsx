import type { Metadata } from "next";
import { MAGAM_SHARE_PAGE_TITLE } from "@/lib/magam/copy";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: {
    default: MAGAM_SHARE_PAGE_TITLE,
    template: "%s",
  },
  applicationName: MAGAM_SHARE_PAGE_TITLE,
  openGraph: {
    siteName: MAGAM_SHARE_PAGE_TITLE,
  },
};

export default function MagamShareLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-slate-50">{children}</div>;
}
