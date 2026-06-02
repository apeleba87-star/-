import { formatSearchIndexPercent, formatSearchVolumeMonth } from "@/lib/demand/copy";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";
import { cn } from "@/lib/utils";

export function DemandSearchVolumeCell({ metric }: { metric: DemandKeywordMetricSlice }) {
  if (metric.searchVolumeMonth != null) {
    return (
      <span className="text-sm font-semibold tabular-nums text-slate-900">
        {formatSearchVolumeMonth(metric.searchVolumeMonth)}
      </span>
    );
  }
  if (metric.searchVolumeBelowTen) {
    return <span className="text-sm text-slate-500">&lt;10</span>;
  }
  return <span className="text-slate-400">—</span>;
}

export function DemandSearchIndexCell({ metric }: { metric: DemandKeywordMetricSlice }) {
  const value = metric.indexDodPercent;
  const up = value > 0;
  const down = value < 0;

  return (
    <span
      className={cn(
        "text-sm font-semibold tabular-nums",
        up ? "text-emerald-600" : down ? "text-rose-600" : "text-slate-800"
      )}
    >
      {formatSearchIndexPercent(value)}
    </span>
  );
}
