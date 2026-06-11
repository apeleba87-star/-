"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/radar-ads", label: "대시보드", exact: true },
  { href: "/admin/radar-ads/region-views", label: "지역 조회", exact: true },
  { href: "/admin/radar-ads/manage", label: "광고 관리", exact: false },
] as const;

export default function RadarAdsSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
