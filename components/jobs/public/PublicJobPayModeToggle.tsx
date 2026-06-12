"use client";

import { usePublicJobPayMode } from "@/components/jobs/public/PublicJobPayModeProvider";
import { PUBLIC_JOB_PAY_MODE_OPTIONS } from "@/lib/jobs-public/pay-display-mode";
import { cn } from "@/lib/utils";

export default function PublicJobPayModeToggle() {
  const { payMode, setPayMode } = usePublicJobPayMode();

  return (
    <div
      className="inline-flex rounded-xl border-2 border-slate-200 p-0.5"
      role="group"
      aria-label="급여 표시 단위"
    >
      {PUBLIC_JOB_PAY_MODE_OPTIONS.map((opt) => {
        const active = payMode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPayMode(opt.value)}
            aria-pressed={active}
            className={cn(
              "min-h-[40px] rounded-lg px-3 text-sm font-semibold",
              active ? "bg-slate-900 text-white" : "text-slate-600"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
