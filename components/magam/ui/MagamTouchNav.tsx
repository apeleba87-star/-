"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** 모바일 탭·버튼 — 눌림 즉시 반응 */
export const magamTapClass =
  "touch-manipulation select-none transition-[transform,opacity,background-color] duration-75 active:scale-[0.97] active:opacity-90";

export function MagamTouchSpinner({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-5 w-5 border-2" : "h-3.5 w-3.5 border-[1.5px]";
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-[#2563EB] border-t-transparent",
        dim,
        className
      )}
      aria-hidden
    />
  );
}

type NavTabProps = {
  href: string;
  active: boolean;
  label: string;
  icon: string;
};

export function MagamNavTab({ href, active, label, icon }: NavTabProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const showActive = active || pendingHref === href;

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <Link
      href={href}
      prefetch
      onClick={() => {
        if (!active) setPendingHref(href);
      }}
      aria-current={showActive ? "page" : undefined}
      className={cn(
        magamTapClass,
        "flex flex-1 flex-col items-center gap-0.5 rounded-[12px] py-2.5 text-[11px] font-semibold",
        showActive ? "bg-[#EEF3FF] text-[#2563EB]" : "text-[#5B6472] active:bg-[#F2F3F6]"
      )}
    >
      <span className="flex h-6 items-center justify-center text-lg leading-none" aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}

type TapLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
};

export function MagamTapLink({ href, className, children, prefetch = true }: TapLinkProps) {
  return (
    <Link href={href} prefetch={prefetch} className={cn(magamTapClass, "block", className)}>
      {children}
    </Link>
  );
}
