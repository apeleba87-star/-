import { DEMAND_HEAT_BAND_LABELS } from "@/lib/demand/copy";
import type { DemandHeatBand } from "@/lib/demand/district-demand-score";
import type { DemandHeatBandMeta } from "@/lib/demand/demand-heat-band";
import { formatDemandHeatPercentileSentence } from "@/lib/demand/demand-heat-copy";
import { cn } from "@/lib/utils";

function heatTooltip(
  band: DemandHeatBand,
  heat?: DemandHeatBandMeta | null
): string {
  const base = DEMAND_HEAT_BAND_LABELS[band].description;
  if (heat?.relative && heat.percentile != null) {
    const sentence = formatDemandHeatPercentileSentence(heat);
    return sentence ? `${base} ${sentence}` : base;
  }
  return base;
}

export default function DemandHeatBadge({
  band,
  score,
  heat,
  className,
  compact,
  prominent,
}: {
  band: DemandHeatBand;
  score?: number;
  heat?: DemandHeatBandMeta | null;
  className?: string;
  compact?: boolean;
  /** 입주 예상 점수 — 목록·카드 강조 */
  prominent?: boolean;
}) {
  const s = DEMAND_HEAT_BAND_LABELS[band];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        s.className,
        compact && !prominent && "px-2 py-0.5 text-[11px]",
        prominent && "gap-1.5 px-3 py-1 text-sm shadow-sm ring-2",
        prominent && "items-center",
        className
      )}
      title={heatTooltip(band, heat)}
    >
      <span aria-hidden className={cn(prominent && "text-base")}>
        {s.emoji}
      </span>
      {score != null ? (
        <>
          <span className={cn("tabular-nums", prominent && "text-lg font-black tracking-tight")}>
            {score}
          </span>
          <span className={cn("font-normal opacity-80", prominent && "text-xs font-semibold")}>
            {s.label}
          </span>
        </>
      ) : (
        s.label
      )}
    </span>
  );
}
