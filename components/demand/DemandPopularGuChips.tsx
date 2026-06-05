"use client";

import { DEMAND_HUB_TOP_DISTRICTS_LABEL } from "@/lib/demand/copy";
import {
  demandRegionSelectionKey,
  type DemandRegionSelection,
} from "@/lib/demand/regions";

const SEOUL_CITY_ID = "seoul";

export type DemandTopDistrictPick = {
  slug: string;
  gu: string;
  score: number;
  rank: number;
};

type Props = {
  picks: DemandTopDistrictPick[];
  selections: DemandRegionSelection[];
  onAdd: (sel: DemandRegionSelection) => void;
  atMax: boolean;
};

export default function DemandPopularGuChips({ picks, selections, onAdd, atMax }: Props) {
  if (picks.length === 0) return null;

  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50/40 px-3 py-3">
      <p className="text-xs font-semibold text-teal-900">{DEMAND_HUB_TOP_DISTRICTS_LABEL}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {picks.map((d) => {
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
                disabled={picked || atMax}
                onClick={() => onAdd(sel)}
                className="min-h-11 rounded-full border border-teal-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:border-teal-400 hover:bg-teal-50 disabled:cursor-default disabled:opacity-50"
              >
                <span className="text-teal-600">{d.rank}</span> {d.gu}
                <span className="ml-1.5 tabular-nums font-bold text-teal-800">{d.score}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
