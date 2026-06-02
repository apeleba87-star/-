"use client";

import { guNameToSlug } from "@/lib/demand/slugs";
import {
  DEMAND_MAX_REGION_COMPARE,
  demandRegionSelectionKey,
  type DemandRegionSelection,
} from "@/lib/demand/regions";

const SEOUL_CITY_ID = "seoul";

type Props = {
  similarGu: string[];
  selections: DemandRegionSelection[];
  onAdd: (sel: DemandRegionSelection) => void;
};

export default function DemandNeighborSuggest({ similarGu, selections, onAdd }: Props) {
  if (selections.length >= DEMAND_MAX_REGION_COMPARE) return null;

  const candidates = similarGu
    .map((gu) => {
      const slug = guNameToSlug(gu);
      if (!slug) return null;
      const sel = {
        scope: "district" as const,
        cityId: SEOUL_CITY_ID,
        guSlug: slug,
      };
      const key = demandRegionSelectionKey(sel);
      if (selections.some((s) => demandRegionSelectionKey(s) === key)) return null;
      return { gu, sel };
    })
    .filter((x): x is { gu: string; sel: Extract<DemandRegionSelection, { scope: "district" }> } => x != null)
    .slice(0, 4);

  if (candidates.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-3">
      <p className="text-xs font-semibold text-slate-600">함께 비교해 보세요</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {candidates.map(({ gu, sel }) => (
          <li key={gu}>
            <button
              type="button"
              onClick={() => onAdd(sel)}
              className="rounded-md border border-teal-200 bg-teal-50/50 px-2.5 py-1 text-xs font-medium text-teal-900 hover:bg-teal-50"
            >
              + {gu}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
