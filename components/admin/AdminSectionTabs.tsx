"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminSectionTab = {
  href: string;
  label: string;
};

export default function AdminSectionTabs({ tabs }: { tabs: AdminSectionTab[] }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
