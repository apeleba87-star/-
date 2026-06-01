import { SIGNAL_LABELS } from "@/lib/demand/copy";
import type { DemandSignal } from "@/lib/demand/types";
import { cn } from "@/lib/utils";

export default function SignalBadge({
  signal,
  className,
}: {
  signal: DemandSignal;
  className?: string;
}) {
  const s = SIGNAL_LABELS[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        s.className,
        className
      )}
    >
      <span aria-hidden>{s.emoji}</span>
      {s.label}
    </span>
  );
}
