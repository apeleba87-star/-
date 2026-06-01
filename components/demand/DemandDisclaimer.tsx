import { DEMAND_DISCLAIMER } from "@/lib/demand/copy";
import { cn } from "@/lib/utils";

export default function DemandDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs leading-relaxed text-slate-500", className)}>
      {DEMAND_DISCLAIMER}
    </p>
  );
}
