"use client";

import { formatSearchIndexPercent, formatSearchVolumeMonth } from "@/lib/demand/copy";
import { searchIndexBarPercent } from "@/lib/demand/chart-scale";
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
  const barPos = searchIndexBarPercent(value);

  return (
    <span className="inline-flex min-w-[5.5rem] flex-col items-end gap-1">
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          up ? "text-emerald-600" : down ? "text-rose-600" : "text-slate-800"
        )}
      >
        {formatSearchIndexPercent(value)}
      </span>
      <span
        className="relative h-1.5 w-full max-w-[4.5rem] overflow-hidden rounded-full bg-slate-100"
        aria-hidden
      >
        <span className="absolute left-1/2 top-0 h-full w-px bg-slate-300" />
        <span
          className={cn(
            "absolute top-0 h-full w-0.5 rounded-full",
            up ? "bg-emerald-500" : down ? "bg-rose-500" : "bg-slate-400"
          )}
          style={{ left: `calc(${barPos}% - 1px)` }}
        />
      </span>
    </span>
  );
}
