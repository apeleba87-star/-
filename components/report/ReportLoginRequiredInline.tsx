"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

type Props = {
  /** 로그인 후 돌아올 경로 (선택) */
  loginNext?: string;
  className?: string;
};

/** 표·카드 안 숫자 대체용 (티저 구간 밖) */
export default function ReportLoginRequiredInline({ loginNext, className = "" }: Props) {
  const href = loginNext ? `/login?next=${encodeURIComponent(loginNext)}` : "/login";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 ${className}`}
    >
      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
      <span className="text-sm font-medium tabular-nums">로그인 필요</span>
    </Link>
  );
}
