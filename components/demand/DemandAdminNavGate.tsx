"use client";

import { useEffect, useState } from "react";
import DemandNav from "@/components/demand/DemandNav";
import { createClient } from "@/lib/supabase";

/** 입주레이더 서브네비 — 전 사용자 입주레이더, 관리자는 [관] 서브메뉴 추가 */
export default function DemandAdminNavGate({ className }: { className?: string }) {
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

  return <DemandNav className={className} isAdmin={isAdmin} />;
}
