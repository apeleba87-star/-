import { formatSearchIndexPercent } from "@/lib/demand/copy";
import { DEMAND_TODAY_META } from "@/lib/demand/dummy-daily";
import type { DemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";
import { cn } from "@/lib/utils";

export default function DemandSearchPulseBar({
  metrics,
}: {
  metrics: DemandNationalKeywordMetrics;
}) {
  const items = [
    { label: "포장이사 검색지수", value: metrics.packing.indexDodPercent },
    { label: "입주청소 검색지수", value: metrics.moveInClean.indexDodPercent },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs">
      <span className="font-semibold text-slate-700">전국 검색 펄스</span>
      <span className="text-slate-400">{DEMAND_TODAY_META.compareLabel}</span>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map(({ label, value }) => (
          <li key={label} className="tabular-nums">
            <span className="text-slate-600">{label}</span>{" "}
            <span
              className={cn(
                "font-bold",
                value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-800"
              )}
            >
              {formatSearchIndexPercent(value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
