import { formatMomPercent } from "@/lib/demand/copy";
import { cn } from "@/lib/utils";

export default function DemandMetricCell({
  value,
  showNationalDot,
}: {
  value: number;
  showNationalDot?: boolean;
}) {
  const up = value > 0;
  const down = value < 0;
  return (
    <span className="inline-flex items-center justify-end gap-1 tabular-nums">
      {showNationalDot ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400"
          title="전국 검색지수(네이버 데이터랩 상대값)"
        />
      ) : null}
      <span
        className={cn(
          "text-sm font-bold",
          up ? "text-emerald-700" : down ? "text-rose-700" : "text-slate-600"
        )}
      >
        {formatMomPercent(value)}
      </span>
    </span>
  );
}
