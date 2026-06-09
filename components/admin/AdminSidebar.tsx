"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ADMIN_HUBS,
  getAdminHubForPath,
  isAdminHubActive,
  isAdminNavItemActive,
} from "@/lib/admin/nav-config";

function NavLink({
  href,
  label,
  active,
  nested,
}: {
  href: string;
  label: string;
  active: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
        nested ? "pl-5" : ""
      } ${
        active
          ? "bg-slate-800 font-medium text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname() ?? "/admin";
  const activeHub = getAdminHubForPath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col gap-1">
      <NavLink href="/admin" label="대시보드" active={pathname === "/admin"} />
      {ADMIN_HUBS.map((hub) => {
        const hubActive = isAdminHubActive(pathname, hub);
        return (
          <div key={hub.id} className="mt-2">
            <NavLink href={hub.href} label={hub.label} active={hubActive && pathname === hub.href} />
            {hubActive && (
              <div className="mt-1 space-y-0.5 border-l border-slate-200 pl-2">
                {hub.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={isAdminNavItemActive(pathname, item.href)}
                    nested
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="mt-6 border-t border-slate-200 pt-4">
        <Link href="/" className="block px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
          사이트로
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <p className="text-sm font-semibold text-slate-800">
          {activeHub ? activeHub.label : "관리자"}
        </p>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          {mobileOpen ? "메뉴 닫기" : "메뉴"}
        </button>
      </div>

      {mobileOpen && (
        <nav className="mb-6 rounded-xl border border-slate-200 bg-white p-3 lg:hidden">
          {sidebarContent}
        </nav>
      )}

      <nav className="hidden w-52 shrink-0 lg:block">
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          관리자
        </p>
        {sidebarContent}
      </nav>
    </>
  );
}
