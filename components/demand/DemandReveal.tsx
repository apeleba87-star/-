"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** 클릭해야 내용이 보이는 탐색용 래퍼 */
export function DemandReveal({
  label,
  hint,
  children,
  className,
  labelClassName,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300",
          labelClassName
        )}
        aria-expanded={open}
      >
        <span>
          <span className="text-sm font-semibold text-slate-900">{label}</span>
          {hint && !open ? <span className="mt-0.5 block text-xs text-slate-400">{hint}</span> : null}
        </span>
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-90")} />
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

export function DemandRevealInline({
  closedLabel,
  children,
}: {
  closedLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-slate-500 underline decoration-dotted underline-offset-2 hover:text-teal-800"
      >
        {closedLabel}
      </button>
    );
  }
  return <>{children}</>;
}
