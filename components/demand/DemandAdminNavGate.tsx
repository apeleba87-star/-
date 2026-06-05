"use client";

import { useEffect, useState } from "react";
import DemandNav from "@/components/demand/DemandNav";
import { createClient } from "@/lib/supabase";

/** 관리자만 서브네비 표시 — 서버 ISR과 분리(쿠키 조회 없음) */
export default function DemandAdminNavGate({ className }: { className?: string }) {
  const [show, setShow] = useState(false);

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
        setShow(true);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;
  return <DemandNav className={className} />;
}
