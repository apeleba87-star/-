"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DEMAND_DAILY_REGION_VIEW_LIMIT,
  DEMAND_USAGE_GUEST_MESSAGE,
} from "@/lib/demand/usage-limits";
import { demandLoginHref, demandSignupHref } from "@/lib/demand/login-cta";
import { cn } from "@/lib/utils";

type Variant = "banner" | "overlay" | "sticky" | "inline";

type Props = {
  variant?: Variant;
  message?: string;
  className?: string;
};

function useDemandAuthHrefs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  return {
    loginHref: demandLoginHref(pathname, search),
    signupHref: demandSignupHref(pathname, search),
  };
}

function LoginButton({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 active:bg-teal-800 touch-manipulation",
        className
      )}
    >
      로그인하고 수치 보기
    </Link>
  );
}

function KakaoHint({ signupHref }: { signupHref: string }) {
  return (
    <p className="text-xs text-slate-500">
      계정이 없으면{" "}
      <Link href={signupHref} className="font-semibold text-teal-700 underline underline-offset-2">
        무료 가입
      </Link>
      <span className="text-slate-400"> · 카카오 1초 로그인</span>
    </p>
  );
}

/** 비로그인 — 로그인 유도 CTA */
export default function DemandGuestLoginCta({
  variant = "banner",
  message,
  className,
}: Props) {
  const { loginHref, signupHref } = useDemandAuthHrefs();
  const body = message ?? DEMAND_USAGE_GUEST_MESSAGE;

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/75 px-4 backdrop-blur-[2px]",
          className
        )}
      >
        <p className="text-center text-xs font-medium text-slate-700">{body}</p>
        <LoginButton href={loginHref} />
        <KakaoHint signupHref={signupHref} />
      </div>
    );
  }

  if (variant === "sticky") {
    return (
      <div
        className={cn(
          "border-t border-teal-100 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-sm",
          className
        )}
      >
        <div className="mx-auto flex max-w-lg flex-col items-stretch gap-2">
          <LoginButton href={loginHref} className="w-full" />
          <p className="text-center text-[11px] text-slate-500">
            하루 {DEMAND_DAILY_REGION_VIEW_LIMIT}개 지역 무료 ·{" "}
            <Link href={signupHref} className="font-semibold text-teal-700">
              가입하기
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <LoginButton href={loginHref} className="px-4 py-2 text-xs" />
        <Link
          href={signupHref}
          className="text-xs font-semibold text-teal-700 underline underline-offset-2"
        >
          가입
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white px-4 py-3.5 shadow-sm",
        className
      )}
    >
      <p className="text-sm text-teal-950">{body}</p>
      <p className="mt-1 text-xs text-teal-800/80">
        하루 {DEMAND_DAILY_REGION_VIEW_LIMIT}개 지역 · 거래·검색·그래프 확인
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <LoginButton href={loginHref} />
        <KakaoHint signupHref={signupHref} />
      </div>
    </div>
  );
}
