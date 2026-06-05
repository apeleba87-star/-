import { DEMAND_HEAT_BAND_LABELS } from "@/lib/demand/copy";
import type { DemandHeatBand } from "@/lib/demand/district-demand-score";
import { cn } from "@/lib/utils";

export default function DemandHeatBadge({
  band,
  score,
  className,
  compact,
}: {
  band: DemandHeatBand;
  score?: number;
  className?: string;
  compact?: boolean;
}) {
  const s = DEMAND_HEAT_BAND_LABELS[band];
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
      {score != null ? (
        <>
          <span className="tabular-nums">{score}</span>
          <span className="font-normal opacity-80">{s.label}</span>
        </>
      ) : (
        s.label
      )}
    </span>
  );
}
