"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function HeaderAuth({
  label,
  onSignedOut,
}: {
  /** 헤더에 보일 이름 (별명). 없으면「마이페이지」 */
  label: string | null;
  onSignedOut?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const logoutInMypageOnly = pathname === "/mypage";
  const [signingOut, setSigningOut] = useState(false);

  async function signOutAndRedirect() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      onSignedOut?.();
      router.replace("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  if (label !== null) {
    const display = label.trim() || "마이페이지";
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 md:flex-nowrap">
        <Link
          href="/mypage"
          className="max-w-[140px] truncate whitespace-nowrap font-medium text-slate-700 hover:text-teal-800 md:max-w-[min(14rem,22vw)]"
          title="마이페이지"
        >
          {display}
        </Link>
        {!logoutInMypageOnly ? (
          <button
            type="button"
            disabled={signingOut}
            className="shrink-0 whitespace-nowrap text-slate-400 hover:text-slate-600 disabled:opacity-50"
            onClick={() => void signOutAndRedirect()}
          >
            {signingOut ? "로그아웃 중…" : "로그아웃"}
          </button>
        ) : null}
      </span>
    );
  }
  return (
    <Link href="/login" className="hover:text-slate-900">
      로그인
    </Link>
  );
}
