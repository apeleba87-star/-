"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DEMAND_DAILY_REGION_VIEW_LIMIT } from "@/lib/demand/usage-limits";
import { demandLoginHref, demandSignupHref } from "@/lib/demand/login-cta";
import { cn } from "@/lib/utils";

type Props = {
  /** 공유 링크 티저 — 점수·거래만 보이고 나머지는 블러 */
  shareTeaser?: boolean;
  /** bar: 모바일 하단 고정 · card: PC 블러 위 안내 카드 */
  variant?: "bar" | "card";
  className?: string;
};

export default function DemandGuestLoginCta({
  shareTeaser = false,
  variant = "bar",
  className,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const loginHref = demandLoginHref(pathname, search);
  const signupHref = demandSignupHref(pathname, search);

  const message = shareTeaser ? (
    <p className="text-center text-sm leading-relaxed text-slate-600">
      지금은 입주 예상 점수·거래 건수만 미리보기입니다.
      <br />
      <span className="font-semibold text-slate-800">로그인하면 검색·그래프까지 전체 데이터</span>를 볼 수
      있습니다.
    </p>
  ) : (
    <p className="text-center text-sm leading-relaxed text-slate-600">
      로그인하면 입주·거래·검색 데이터와 그래프를 확인할 수 있습니다.
    </p>
  );

  const loginLabel = shareTeaser ? "로그인하고 전체 데이터 보기" : "로그인하고 수치 보기";

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-teal-100 bg-white/95 px-6 py-5 shadow-lg ring-1 ring-teal-50 backdrop-blur-sm",
          className
        )}
      >
        <p className="text-center text-base font-semibold text-slate-900">로그인이 필요합니다</p>
        <div className="mt-2">{message}</div>
        <Link
          href={loginHref}
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          {loginLabel}
        </Link>
        <p className="mt-3 text-center text-xs text-slate-500">
          하루 {DEMAND_DAILY_REGION_VIEW_LIMIT}개 지역 무료 ·{" "}
          <Link href={signupHref} className="font-semibold text-teal-700 hover:underline">
            가입하기
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-t border-teal-100 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-sm",
        className
      )}
    >
      <div className="mx-auto flex max-w-lg flex-col items-stretch gap-2">
        {shareTeaser ? (
          <p className="text-center text-xs leading-snug text-slate-600">
            지금은 입주 예상 점수·거래 건수만 미리보기입니다.
            <br />
            <span className="font-medium text-slate-800">로그인하면 검색·그래프까지 전체 데이터</span>를 볼
            수 있습니다.
          </p>
        ) : (
          <p className="text-center text-xs leading-snug text-slate-600">
            로그인하면 입주·거래·검색 데이터를 확인할 수 있습니다.
          </p>
        )}
        <Link
          href={loginHref}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 active:bg-teal-800 touch-manipulation"
        >
          {loginLabel}
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
