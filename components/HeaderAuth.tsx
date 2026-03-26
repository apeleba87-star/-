"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function HeaderAuth({
  email,
  onSignedOut,
}: {
  email: string | null;
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

  if (email) {
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 md:flex-nowrap">
        <Link
          href="/mypage"
          className="max-w-[140px] truncate whitespace-nowrap hover:text-slate-700 md:max-w-[min(14rem,22vw)] lg:max-w-[min(16rem,18vw)] xl:max-w-[min(18rem,16vw)]"
          title={email}
        >
          {email}
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
  return <Link href="/login" className="hover:text-slate-900">로그인</Link>;
}
