"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

function isInvalidSessionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("Refresh Token") ||
    msg.includes("refresh_token") ||
    msg.includes("Invalid Refresh Token") ||
    msg.includes("Refresh Token Not Found")
  );
}

export default function HeaderAuth() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function initAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setEmail(user?.email ?? null);
      } catch (err) {
        if (isInvalidSessionError(err)) {
          await supabase.auth.signOut();
          setEmail(null);
          router.replace("/login");
        }
      }
    }
    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setEmail(null);
      else setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (email) {
    return (
      <span className="text-slate-500">
        <Link href="/mypage" className="hover:text-slate-700">{email}</Link>
        <form action="/api/auth/signout" method="post" className="inline ml-2">
          <button type="submit" className="text-slate-400 hover:text-slate-600">로그아웃</button>
        </form>
      </span>
    );
  }
  return <Link href="/login" className="hover:text-slate-900">로그인</Link>;
}
