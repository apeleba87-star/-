"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AiAccess, UsageSummary } from "@/lib/ai-blog/types";

export default function AiBlogNav({ usage, access }: { usage: UsageSummary | null; access: AiAccess }) {
  const pathname = usePathname();
  const inProfile = pathname.startsWith("/ai-blog/profile");
  const pct = usage ? Math.min(100, (usage.contents_used / Math.max(usage.monthly_content_limit, 1)) * 100) : 0;

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/ai-blog" className="text-sm font-bold text-slate-900">
          AI 블로그
        </Link>
        <nav className="flex items-center gap-1">
          {tab("/ai-blog", "내 현장", !inProfile)}
          {tab("/ai-blog/profile", "업체 프로필", inProfile)}
        </nav>
        <div className="flex-1" />
        {access.expires_on ? (
          <span
            className={`text-xs ${access.state === "active" ? "text-slate-500" : "font-medium text-rose-600"}`}
          >
            {access.state === "suspended" ? "사용 정지" : access.state === "expired" ? "기간 만료" : "이용 기간"} ~{" "}
            {access.expires_on.replaceAll("-", ".")}
          </span>
        ) : null}
        {usage ? (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>이번 달 작성</span>
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </span>
            <span className="font-semibold text-slate-900">
              {usage.contents_used}/{usage.monthly_content_limit}편
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
