"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    setPressed(false);
  }, [active]);

  function handleClick() {
    if (active || isPending) return;
    setPressed(true);
    startTransition(() => {
      router.push(href);
    });
  }

  const showPending = isPending && pressed;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-current={active ? "page" : undefined}
      className={cn(
        magamTapClass,
        "flex flex-1 flex-col items-center gap-0.5 rounded-[12px] py-2.5 text-[11px] font-semibold disabled:pointer-events-none",
        active
          ? "bg-[#EEF3FF] text-[#2563EB]"
          : "text-[#5B6472] active:bg-[#F2F3F6]",
        showPending && "opacity-80"
      )}
    >
      <span className="relative flex h-6 items-center justify-center text-lg leading-none" aria-hidden>
        {showPending ? <MagamTouchSpinner /> : icon}
      </span>
      {label}
    </button>
  );
}

type TapLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
};

export function MagamTapLink({ href, className, children, prefetch = true }: TapLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (isPending) return;
    setArmed(true);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={handleClick}
      aria-busy={isPending || undefined}
      className={cn(
        magamTapClass,
        "relative block",
        isPending && armed && "pointer-events-none opacity-75",
        className
      )}
    >
      {isPending && armed ? (
        <span
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/55"
          aria-hidden
        >
          <MagamTouchSpinner size="md" />
        </span>
      ) : null}
      {children}
    </Link>
  );
}
