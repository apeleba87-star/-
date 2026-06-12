import { DEMAND_REGIONS, type DemandRegionSelection } from "@/lib/demand/regions";
import type { JobPublicRegionDraft } from "@/lib/jobs-public/job-region-scope";

const CITY_ID_BY_PROVINCE_LABEL = new Map(
  DEMAND_REGIONS.map((c) => [c.label, c.id] as const)
);

/** 일당 리포트 시·도명 → 입주레이더 cityId */
export function demandCityIdFromProvinceLabel(province: string): string | null {
  const trimmed = province.trim();
  if (!trimmed) return null;
  const direct = CITY_ID_BY_PROVINCE_LABEL.get(trimmed);
  if (direct) return direct;
  const city = DEMAND_REGIONS.find(
    (c) => c.fullLabel === trimmed || c.fullLabel.startsWith(trimmed) || trimmed.startsWith(c.label)
  );
  return city?.id ?? null;
}

export function demandSelectionFromProvinceLabel(
  province: string
): DemandRegionSelection | null {
  const cityId = demandCityIdFromProvinceLabel(province);
  return cityId ? { scope: "city", cityId } : null;
}

export function demandSelectionFromJobPublicDraft(
  draft: JobPublicRegionDraft
): DemandRegionSelection | null {
  if (draft.scope === "national") return { scope: "national" };
  if (draft.scope === "city") return { scope: "city", cityId: draft.cityId };
  return { scope: "district", cityId: draft.cityId, guSlug: draft.guSlug };
}

export function jobPublicDraftFromDemandSelection(
  sel: DemandRegionSelection
): JobPublicRegionDraft {
  if (sel.scope === "national") return { scope: "national" };
  if (sel.scope === "city") return { scope: "city", cityId: sel.cityId };
  return { scope: "district", cityId: sel.cityId, guSlug: sel.guSlug };
}
