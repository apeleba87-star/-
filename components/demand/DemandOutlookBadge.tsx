import { OUTLOOK_LABELS } from "@/lib/demand/copy";
import type { DemandOutlook } from "@/lib/demand/outlook";
import { cn } from "@/lib/utils";

export default function DemandOutlookBadge({
  outlook,
  className,
  compact,
}: {
  outlook: DemandOutlook;
  className?: string;
  compact?: boolean;
}) {
  const s = OUTLOOK_LABELS[outlook];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        s.className,
        compact && "px-2 py-0.5 text-[11px]",
        className
      )}
      title={s.description}
    >
      <span aria-hidden>{s.emoji}</span>
      {s.label}
    </span>
  );
}
