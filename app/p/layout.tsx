import type { Metadata } from "next";
import Link from "next/link";
import { MAGAM_SHARE_PAGE_TITLE } from "@/lib/magam/copy";
import { MAGAM_LIVE_PATH } from "@/lib/magam/nav-links";

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
  return (
    <div className="flex min-h-[60vh] flex-col bg-slate-50">
      <div className="flex-1">{children}</div>
      <footer className="border-t border-slate-200/80 px-4 py-4 text-center text-xs text-slate-400">
        <Link href={MAGAM_LIVE_PATH} className="font-medium text-slate-600 underline-offset-2 hover:underline">
          전체 모집 목록 보기
        </Link>
      </footer>
    </div>
  );
}
