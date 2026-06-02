import { formatMomPercent, formatTradeCount } from "@/lib/demand/copy";
import { linearMap } from "@/lib/demand/chart-scale";
import { cn } from "@/lib/utils";

const TRADE_MOM_MIN = -25;
const TRADE_MOM_MAX = 25;

function tradeMomBarPercent(mom: number): number {
  const clamped = Math.max(TRADE_MOM_MIN, Math.min(TRADE_MOM_MAX, mom));
  return linearMap(clamped, TRADE_MOM_MIN, TRADE_MOM_MAX, 0, 100);
}

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
  const barPos = tradeMomBarPercent(momPercent);

  if (compact) {
    return (
      <span className="inline-flex min-w-[6.5rem] flex-col items-end gap-1 tabular-nums text-sm text-slate-800">
        <span>
          {formatTradeCount(count)}{" "}
          <span className={cn("font-medium", momClass)}>({formatMomPercent(momPercent)})</span>
        </span>
        <span className="relative h-1.5 w-full max-w-[5rem] overflow-hidden rounded-full bg-slate-100" aria-hidden>
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

  return (
    <span className="inline-flex flex-col items-end gap-1 tabular-nums">
      <span className="text-sm font-semibold text-slate-900">{formatTradeCount(count)}</span>
      <span className={cn("text-xs font-medium", momClass)}>{formatMomPercent(momPercent)}</span>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden>
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
