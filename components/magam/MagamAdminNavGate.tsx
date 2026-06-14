"use client";

import { useEffect, useState } from "react";
import MagamNav from "@/components/magam/MagamNav";
import { createClient } from "@/lib/supabase";

/** 모집 서브네비 — 관리자 [관] 실시간 */
export default function MagamAdminNavGate({ className }: { className?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!cancelled && profile?.role === "admin") {
        setIsAdmin(true);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  return <MagamNav className={className} isAdmin={isAdmin} />;
}
