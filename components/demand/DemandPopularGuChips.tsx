"use client";

import { DEMAND_TOP10 } from "@/lib/demand/dummy-data";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import { demandRegionSelectionKey } from "@/lib/demand/regions";

const SEOUL_CITY_ID = "seoul";

type Props = {
  selections: DemandRegionSelection[];
  onAdd: (sel: DemandRegionSelection) => void;
};

export default function DemandPopularGuChips({ selections, onAdd }: Props) {
  const picks = DEMAND_TOP10.slice(0, 5);

  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-4">
      <p className="text-xs font-semibold text-slate-600">이번 달 신호가 큰 구</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {picks.map((d, i) => {
          const sel: DemandRegionSelection = {
            scope: "district",
            cityId: SEOUL_CITY_ID,
            guSlug: d.slug,
          };
          const key = demandRegionSelectionKey(sel);
          const picked = selections.some((s) => demandRegionSelectionKey(s) === key);
          return (
            <li key={d.slug}>
              <button
                type="button"
                disabled={picked}
                onClick={() => onAdd(sel)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50 disabled:cursor-default disabled:opacity-50"
              >
                <span className="text-slate-400">{i + 1}</span> {d.gu}
                <span className="ml-1 tabular-nums text-teal-700">{d.indexScore}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
