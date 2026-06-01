import { formatMomPercent, formatTradeCount } from "@/lib/demand/copy";
import { cn } from "@/lib/utils";

/** 구별 RTMS — 기준월 건수 + 전월 대비 % */
export default function DemandTradeMetricCell({
  count,
  momPercent,
}: {
  count: number;
  momPercent: number;
}) {
  const up = momPercent > 0;
  const down = momPercent < 0;
  return (
    <span className="inline-flex flex-col items-end gap-0.5 tabular-nums">
      <span className="text-sm font-bold text-slate-900">{formatTradeCount(count)}</span>
      <span
        className={cn(
          "text-xs font-semibold",
          up ? "text-emerald-700" : down ? "text-rose-700" : "text-slate-500"
        )}
      >
        {formatMomPercent(momPercent)}
      </span>
    </span>
  );
}
