import { formatMomPercent, formatTradeCount } from "@/lib/demand/copy";
import { cn } from "@/lib/utils";

/** 구별 RTMS — 건수 + 전월 대비 % */
export default function DemandTradeMetricCell({
  count,
  momPercent,
  compact = false,
}: {
  count: number;
  momPercent: number;
  compact?: boolean;
}) {
  const up = momPercent > 0;
  const down = momPercent < 0;
  const momClass = up ? "text-emerald-600" : down ? "text-rose-600" : "text-slate-500";

  if (compact) {
    return (
      <span className="tabular-nums text-sm text-slate-800">
        {formatTradeCount(count)}{" "}
        <span className={cn("font-medium", momClass)}>({formatMomPercent(momPercent)})</span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5 tabular-nums">
      <span className="text-sm font-semibold text-slate-900">{formatTradeCount(count)}</span>
      <span className={cn("text-xs font-medium", momClass)}>{formatMomPercent(momPercent)}</span>
    </span>
  );
}
