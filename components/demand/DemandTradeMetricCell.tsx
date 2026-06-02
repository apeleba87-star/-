import { formatMomPercent, formatTradeCount } from "@/lib/demand/copy";
import { cn } from "@/lib/utils";

export default function DemandTradeMetricCell({
  count,
  momPercent,
}: {
  count: number;
  momPercent: number;
}) {
  const up = momPercent > 0;
  const down = momPercent < 0;
  const momClass = up ? "text-emerald-600" : down ? "text-rose-600" : "text-slate-500";

  return (
    <span className="tabular-nums text-sm text-slate-800">
      {formatTradeCount(count)}{" "}
      <span className={cn("font-medium", momClass)}>({formatMomPercent(momPercent)})</span>
    </span>
  );
}
