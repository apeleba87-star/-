"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DemandRegionPicker from "@/components/demand/DemandRegionPicker";
import { DemandSearchIndexCell, DemandSearchVolumeCell } from "@/components/demand/DemandSearchMetricCell";
import DemandTradeMetricCell from "@/components/demand/DemandTradeMetricCell";
import { DEMAND_METRIC_LABELS } from "@/lib/demand/copy";
import { DEMAND_SNAPSHOT_META } from "@/lib/demand/dummy-data";
import type { DemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";
import {
  DEMAND_MAX_REGION_COMPARE,
  demandRegionSelectionKey,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { buildDemandScopeRows } from "@/lib/demand/scope-data";

type Props = {
  keywordMetrics: DemandNationalKeywordMetrics;
};

export default function DemandRegionTable({ keywordMetrics }: Props) {
  const [selections, setSelections] = useState<DemandRegionSelection[]>([]);

  const scopeRows = useMemo(() => buildDemandScopeRows(selections), [selections]);
  const hasSelection = selections.length > 0;

  function onAdd(sel: DemandRegionSelection) {
    const key = demandRegionSelectionKey(sel);
    setSelections((prev) => {
      if (prev.some((s) => demandRegionSelectionKey(s) === key)) return prev;
      if (prev.length >= DEMAND_MAX_REGION_COMPARE) return prev;
      return [...prev, sel];
    });
  }

  function onRemove(key: string) {
    setSelections((prev) => prev.filter((s) => demandRegionSelectionKey(s) !== key));
  }

  return (
    <div className="space-y-5">
      <DemandRegionPicker selections={selections} onAdd={onAdd} onRemove={onRemove} />

      {!hasSelection ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          시·도와 구를 선택해 추가하면 지표가 표시됩니다
        </p>
      ) : scopeRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 py-8 text-center text-sm text-amber-900">
          데이터 준비 중입니다
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-600">
                <th className="px-3 py-2.5 font-medium">지역</th>
                <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.sale}</th>
                <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.jeonse}</th>
                <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.packingVolume}</th>
                <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.packingIndex}</th>
                <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.moveInVolume}</th>
                <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.moveInIndex}</th>
                <th className="px-3 py-2.5 text-right font-medium">{DEMAND_METRIC_LABELS.composite}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scopeRows.map((row) => (
                <tr key={demandRegionSelectionKey(row.selection)}>
                  <td className="px-3 py-2.5">
                    {row.hasDetail && row.slug ? (
                      <Link href={`/demand/region/${row.slug}`} className="font-medium text-teal-800 hover:underline">
                        {row.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-800">{row.label}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DemandTradeMetricCell count={row.saleCount} momPercent={row.saleMom} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DemandTradeMetricCell count={row.jeonseCount} momPercent={row.jeonseMom} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DemandSearchVolumeCell metric={row.packing} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DemandSearchIndexCell metric={row.packing} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DemandSearchVolumeCell metric={row.moveInClean} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DemandSearchIndexCell metric={row.moveInClean} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-teal-800">
                    {row.indexScore ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
            {DEMAND_SNAPSHOT_META.baseMonthLabel} 기준 · 키워드별 검색량(더미)
          </p>
        </div>
      )}
    </div>
  );
}
