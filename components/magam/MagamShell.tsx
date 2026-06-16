"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import MagamTabHints from "@/components/magam/onboarding/MagamTabHints";
import MagamInAppBrowserBanner from "@/components/magam/MagamInAppBrowserBanner";
import { MagamNavTab } from "@/components/magam/ui/MagamTouchNav";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/magam/me", label: "내 공고", icon: "📥" },
  { href: "/magam/write", label: "글쓰기", icon: "✏️" },
  { href: "/magam/settings", label: "설정", icon: "⚙️" },
] as const;

function hideBottomNav(pathname: string): boolean {
  return pathname === "/magam/support" || pathname === "/magam/live";
}

function isTabActive(pathname: string, href: string): boolean {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  if (href === "/magam/me" && pathname.startsWith("/magam/listing/")) return true;
  return false;
}

function hideInAppBrowserBanner(pathname: string): boolean {
  return pathname.startsWith("/magam/listing/");
}

export default function MagamShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const showNav = !hideBottomNav(pathname);
  const showTabHints = showNav && (pathname === "/magam/me" || pathname.startsWith("/magam/listing/"));
  const showInAppBanner = !hideInAppBrowserBanner(pathname);

  useEffect(() => {
    for (const tab of TABS) {
      router.prefetch(tab.href);
    }
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col">
      <div className={cn("flex-1 px-4 pt-3", showNav ? "pb-24" : "pb-6")}>
        {showInAppBanner ? <MagamInAppBrowserBanner /> : null}
        {children}
      </div>
      {showTabHints ? <MagamTabHints /> : null}
      {showNav ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E3E6EC] bg-white pb-[env(safe-area-inset-bottom,0px)]"
          aria-label="마감링크"
        >
          <div className="mx-auto flex max-w-lg gap-1 px-1 pt-1">
            {TABS.map((tab) => {
              const active = isTabActive(pathname, tab.href);
              return (
                <MagamNavTab
                  key={tab.href}
                  href={tab.href}
                  active={active}
                  label={tab.label}
                  icon={tab.icon}
                />
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
