"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; exact?: boolean };

const LINKS: NavLink[] = [
  { href: "/demand", label: "지역표", exact: true },
  { href: "/demand/top", label: "TOP10" },
  { href: "/demand/movers", label: "급상승" },
  { href: "/demand/region", label: "지역" },
  { href: "/demand/compare", label: "비교" },
  { href: "/demand/hits", label: "적중" },
  { href: "/demand/keyword", label: "키워드" },
];

export default function DemandNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1 shadow-sm ring-1 ring-slate-100/80 backdrop-blur-sm",
        className
      )}
      aria-label="입주수요 탐색"
    >
      {LINKS.map(({ href, label, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm",
              active
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
