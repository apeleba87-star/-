import { getDemandCity, type DemandRegionSelection } from "@/lib/demand/regions";

/** 입주레이더 시·도 선택 → 일당 리포트 `province` 키 (예: 서울, 경기) */
export function demandSelectionToJobWageProvince(sel: DemandRegionSelection): string | null {
  if (sel.scope === "national") return null;
  return getDemandCity(sel.cityId)?.label ?? null;
}
