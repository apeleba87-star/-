"use client";

import Link from "next/link";
import { ChevronDown, FileText } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  accent?: "sky" | "amber" | "emerald";
};

export default function PaidTermsDisclosure({
  open,
  onOpenChange,
  children,
  accent = "emerald",
}: Props) {
  const styles =
    accent === "amber"
      ? {
          wrap: "border-stone-200 bg-white",
          btn: "text-stone-800 hover:bg-stone-50",
          panel: "border-stone-100 bg-stone-50/80 text-stone-700",
          link: "text-amber-800 hover:text-amber-950",
        }
      : accent === "sky"
        ? {
            wrap: "border-slate-200 bg-white",
            btn: "text-slate-800 hover:bg-slate-50",
            panel: "border-slate-100 bg-slate-50/80 text-slate-700",
            link: "text-sky-800 hover:text-sky-950",
          }
        : {
            wrap: "border-emerald-200/80 bg-white",
            btn: "text-slate-800 hover:bg-emerald-50/60",
            panel: "border-emerald-100 bg-emerald-50/40 text-slate-700",
            link: "text-emerald-800 hover:text-emerald-950",
          };

  return (
    <div className={`overflow-hidden rounded-2xl border ${styles.wrap} shadow-sm`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold transition ${styles.btn}`}
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          <span>유료구독 약관 · 결제 안내</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className={`border-t px-4 py-3.5 text-xs leading-relaxed ${styles.panel}`}>
          {children}
          <p className="mt-3">
            <Link
              href="/subscribe/terms"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold underline ${styles.link}`}
            >
              유료구독 약관 전문 새 창으로 보기
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
