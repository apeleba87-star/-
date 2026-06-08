"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DEMAND_DAILY_REGION_VIEW_LIMIT } from "@/lib/demand/usage-limits";
import { demandLoginHref, demandSignupHref } from "@/lib/demand/login-cta";

/** 비로그인 — 모바일 하단 고정 로그인 바 */
export default function DemandGuestLoginCta() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const loginHref = demandLoginHref(pathname, search);
  const signupHref = demandSignupHref(pathname, search);

  return (
    <div className="border-t border-teal-100 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg flex-col items-stretch gap-2">
        <Link
          href={loginHref}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 active:bg-teal-800 touch-manipulation"
        >
          로그인하고 수치 보기
        </Link>
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
