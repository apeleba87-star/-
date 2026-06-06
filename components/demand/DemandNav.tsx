"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { demandNavLinksForUser } from "@/lib/demand/nav-links";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  isAdmin?: boolean;
};

export default function DemandNav({ className, isAdmin = false }: Props) {
  const pathname = usePathname();
  const links = demandNavLinksForUser(isAdmin);

  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1 shadow-sm ring-1 ring-slate-100/80 backdrop-blur-sm",
        className
      )}
      aria-label="입주레이더"
    >
      {links.map(({ href, label, exact }) => {
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
