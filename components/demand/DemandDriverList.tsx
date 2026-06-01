"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ScopeBadge from "@/components/demand/ScopeBadge";
import { DemandReveal } from "@/components/demand/DemandReveal";
import { formatMomPercent, formatTradeCount } from "@/lib/demand/copy";
import type { DemandDriver } from "@/lib/demand/types";
import { cn } from "@/lib/utils";

export default function DemandDriverList({ drivers, gu }: { drivers: DemandDriver[]; gu: string }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <DemandReveal label="근거 데이터" hint="4개 항목 · 수치는 항목별로 확인">
      <div className="rounded-xl border border-slate-200/80 bg-white ring-1 ring-slate-100/80">
        <ul className="divide-y divide-slate-100">
          {drivers.map((d) => {
            const open = openKey === d.key;
            return (
              <li key={d.key}>
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : d.key)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50/80"
                  aria-expanded={open}
                >
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                    {d.label}
                    {d.scope === "district" ? (
                      <span className="ml-1 font-normal text-slate-400">({gu})</span>
                    ) : (
                      <ScopeBadge scope="national" className="ml-2 inline-flex" />
                    )}
                  </span>
                  {open ? (
                    <span className="shrink-0 text-right">
                      {d.monthCount != null ? (
                        <span className="block text-sm font-bold tabular-nums text-slate-900">
                          {formatTradeCount(d.monthCount)}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "block text-xs font-semibold tabular-nums",
                          d.momPercent > 0 ? "text-emerald-700" : d.momPercent < 0 ? "text-rose-700" : "text-slate-600"
                        )}
                      >
                        {formatMomPercent(d.momPercent)}
                      </span>
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-400">열기</span>
                  )}
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {open ? (
                  <div className="border-t border-slate-50 bg-slate-50/50 px-4 py-4">
                    <p className="text-sm text-slate-800">{d.drilldown.summary}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{d.drilldown.detail}</p>
                    {d.drilldown.chartHint ? (
                      <div className="mt-3 flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-xs text-slate-400">
                        {d.drilldown.chartHint}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </DemandReveal>
  );
}
