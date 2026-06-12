"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { demandLoginHref, demandSignupHref } from "@/lib/demand/login-cta";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** 입주레이더 `DemandGuestLoginCta` bar와 동일 — 모바일 하단 고정 로그인 안내 */
export default function JobWageReportGuestLoginCta({ className }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const loginHref = demandLoginHref(pathname, search);
  const signupHref = demandSignupHref(pathname, search);

  return (
    <div
      className={cn(
        "border-t border-teal-100 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-sm",
        className
      )}
    >
      <div className="mx-auto flex max-w-lg flex-col items-stretch gap-2">
        <p className="text-center text-xs leading-snug text-slate-600">
          지금은 요약만 미리보기입니다.
          <br />
          <span className="font-medium text-slate-800">로그인하면 시·도별 일당 표·지도</span>를 볼 수
          있습니다.
        </p>
        <Link
          href={loginHref}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 active:bg-teal-800 touch-manipulation"
        >
          로그인하고 전체 보기
        </Link>
        <p className="text-center text-[11px] text-slate-500">
          <Link href={signupHref} className="font-semibold text-teal-700">
            가입하기
          </Link>
        </p>
      </div>
    </div>
  );
}
