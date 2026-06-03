import { formatPackingInterestSub, computePackingInterestScore } from "@/lib/demand/packing-interest";
import type { DemandKeywordMetricSlice } from "@/lib/demand/keyword-metrics";

export function DemandPackingInterestCell({
  metric,
}: {
  metric: DemandKeywordMetricSlice & { indexRatio?: number };
}) {
  const score = computePackingInterestScore(metric);
  return (
    <div className="text-right">
      <span className="text-sm font-semibold tabular-nums text-emerald-800">{score}</span>
      <p className="mt-0.5 text-[10px] tabular-nums text-slate-500">{formatPackingInterestSub(metric)}</p>
    </div>
  );
}
