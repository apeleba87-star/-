"use client";

import DemandSearch from "@/components/demand/DemandSearch";
import { DEMAND_HUB_SEARCH_HINT, DEMAND_HUB_SEARCH_PLACEHOLDER } from "@/lib/demand/copy";

type Props = {
  onDistrictAdd: (slug: string) => void;
};

export default function DemandHubSearch({ onDistrictAdd }: Props) {
  return (
    <div className="space-y-1.5">
      <DemandSearch
        variant="hero"
        onDistrictAdd={onDistrictAdd}
        placeholder={DEMAND_HUB_SEARCH_PLACEHOLDER}
      />
      <p className="text-xs text-slate-500">{DEMAND_HUB_SEARCH_HINT}</p>
    </div>
  );
}
