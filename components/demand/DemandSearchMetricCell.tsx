import { formatMomPercent } from "@/lib/demand/copy";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";
import { cn } from "@/lib/utils";

/** 검색광고 — 120,000 */
export function DemandSearchVolumeCell({ metric }: { metric: DemandKeywordMetricSlice }) {
  if (metric.searchVolumeMonth != null) {
    return (
      <span className="text-sm font-semibold tabular-nums text-slate-900">
        {metric.searchVolumeMonth.toLocaleString("ko-KR")}
      </span>
    );
  }
  if (metric.searchVolumeBelowTen) {
    return <span className="text-sm text-slate-500">&lt;10</span>;
  }
  return <span className="text-slate-400">—</span>;
}

/** 데이터랩 — 11% (전일) */
export function DemandSearchIndexCell({ metric }: { metric: DemandKeywordMetricSlice }) {
  const up = metric.indexDodPercent > 0;
  const down = metric.indexDodPercent < 0;
  return (
    <span
      className={cn(
        "text-sm font-semibold tabular-nums",
        up ? "text-emerald-600" : down ? "text-rose-600" : "text-slate-800"
      )}
    >
      {formatMomPercent(metric.indexDodPercent)}
    </span>
  );
}
