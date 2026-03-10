"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { motion } from "framer-motion";

type Props = {
  /** "pc" = 데스크톱 헤더, "mobile" = 모바일 드로어 */
  variant: "pc" | "mobile";
  onClick?: () => void;
};

export default function HeaderAdminLink({ variant, onClick }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setShow(false);
        return;
      }
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setShow(data?.role === "admin" || data?.role === "editor");
        });
    });
  }, []);

  if (!show) return null;

  const isPc = variant === "pc";
  const linkClass = isPc
    ? "hidden min-h-[44px] items-center md:flex"
    : "flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 md:hidden";

  return (
    <Link href="/admin" className={linkClass} onClick={onClick}>
      <motion.span
        className={
          isPc
            ? "flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200/80"
            : "flex items-center gap-3"
        }
        whileHover={isPc ? { scale: 1.05 } : {}}
        whileTap={isPc ? { scale: 0.98 } : {}}
      >
        <User className={`shrink-0 text-slate-500 ${isPc ? "h-4 w-4" : "h-5 w-5"}`} />
        <span className={isPc ? "hidden sm:inline" : "font-medium"}>관리자</span>
      </motion.span>
    </Link>
  );
}
