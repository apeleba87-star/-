import { demandRegionSelectionKey, type DemandRegionSelection } from "@/lib/demand/regions";
import type { DemandScopeTableRow } from "@/lib/demand/scope-data";

/** 지역 광고 후보 키 — 포커스 우선, 이후 비교·선택 목록 */
export function resolveRegionalAdRegionKeys(input: {
  focusRowKey: string | null;
  scopeRows: DemandScopeTableRow[];
  selections: DemandRegionSelection[];
}): string[] {
  const keys: string[] = [];
  const add = (key: string) => {
    if (key === "national" || keys.includes(key)) return;
    keys.push(key);
  };

  if (input.focusRowKey && input.focusRowKey !== "national") {
    add(input.focusRowKey);
  }
  for (const row of input.scopeRows) {
    add(demandRegionSelectionKey(row.selection));
  }
  for (const sel of input.selections) {
    add(demandRegionSelectionKey(sel));
  }
  return keys;
}
