"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { withAdminNavLabel } from "@/lib/admin-nav-label";
import { createClient } from "@/lib/supabase";

const FOOTER_LINK_CLASS =
  "text-slate-400 hover:text-teal-300 transition-colors touch-manipulation py-1 text-xs sm:py-2 sm:text-sm";

const ADMIN_LINKS = [
  { href: "/cleanidex", label: "클린아이덱스" },
  { href: "/listings", label: "현장 마켓" },
  { href: "/partners", label: "협력 센터" },
  { href: "/jobs", label: "인력 센터" },
  { href: "/archive", label: "뉴스레터 아카이브" },
];

/** 푸터 3행 — 관리자만 (SSR cookies 회피) */
export default function FooterAdminLinks() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!cancelled && profile?.role === "admin") {
        setIsAdmin(true);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-0 sm:gap-x-6" aria-label="푸터 관리자 메뉴">
      {ADMIN_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={FOOTER_LINK_CLASS}>
          {withAdminNavLabel(link.label)}
        </Link>
      ))}
    </nav>
  );
}
