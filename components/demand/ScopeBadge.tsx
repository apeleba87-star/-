import { cn } from "@/lib/utils";
import type { DemandScope } from "@/lib/demand/types";

export default function ScopeBadge({ scope, className }: { scope: DemandScope; className?: string }) {
  const label = scope === "national" ? "전국" : "해당 구";
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        scope === "national" ? "bg-violet-100 text-violet-800" : "bg-teal-100 text-teal-800",
        className
      )}
    >
      {label}
    </span>
  );
}
