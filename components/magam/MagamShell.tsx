"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import MagamTabHints from "@/components/magam/onboarding/MagamTabHints";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/magam/me", label: "내 공고", icon: "📥", activeIcon: "📥" },
  { href: "/magam/write", label: "글쓰기", icon: "✏️", activeIcon: "✏️" },
  { href: "/magam/settings", label: "설정", icon: "⚙️", activeIcon: "⚙️" },
] as const;

function hideBottomNav(pathname: string): boolean {
  return pathname === "/magam/support" || pathname === "/magam/live";
}

function isTabActive(pathname: string, href: string): boolean {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  if (href === "/magam/me" && pathname.startsWith("/magam/listing/")) return true;
  return false;
}

export default function MagamShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const showNav = !hideBottomNav(pathname);
  const showTabHints = showNav && (pathname === "/magam/me" || pathname.startsWith("/magam/listing/"));

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col">
      <div className={cn("flex-1 px-4 pt-3", showNav ? "pb-24" : "pb-6")}>{children}</div>
      {showTabHints ? <MagamTabHints /> : null}
      {showNav ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E3E6EC] bg-white pb-[env(safe-area-inset-bottom,0px)]"
          aria-label="마감링크"
        >
          <div className="mx-auto flex max-w-lg">
            {TABS.map((tab) => {
              const active = isTabActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition",
                    active ? "text-[#2563EB]" : "text-[#5B6472]"
                  )}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {active ? tab.activeIcon : tab.icon}
                  </span>
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
