"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void signOut()}
      className={
        className ??
        "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
      }
    >
      {busy ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
