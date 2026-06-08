import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";
import type { DemandRegionSelection } from "@/lib/demand/regions";

/** SEO·내부 링크 — `/demand/region/{cityId}/{guSlug}` */
export function demandRegionSeoPath(cityId: string, guSlug: string): string {
  return `/demand/region/${cityId}/${guSlug}`;
}

export function demandRegionSeoPathFromSelection(sel: DemandRegionSelection): string | null {
  if (sel.scope !== "district") return null;
  return demandRegionSeoPath(sel.cityId, sel.guSlug);
}

/** legacy `/demand/region/{guSlug}` — slug 단일 매칭 (동명 시 서울 우선) */
export function findCityIdForDistrictSlug(guSlug: string): { cityId: string; gu: string } | null {
  let fallback: { cityId: string; gu: string } | null = null;
  for (const city of DEMAND_REGION_REGISTRY) {
    const district = city.districts.find((d) => d.slug === guSlug);
    if (!district) continue;
    if (city.id === "seoul") {
      return { cityId: city.id, gu: district.gu };
    }
    fallback = { cityId: city.id, gu: district.gu };
  }
  return fallback;
}

export function parseDemandRegionSeoParams(
  cityId: string,
  guSlug: string
): { cityId: string; guSlug: string; gu: string; cityLabel: string; cityFullLabel: string } | null {
  const city = DEMAND_REGION_REGISTRY.find((c) => c.id === cityId);
  const district = city?.districts.find((d) => d.slug === guSlug);
  if (!city || !district) return null;
  return {
    cityId,
    guSlug,
    gu: district.gu,
    cityLabel: city.label,
    cityFullLabel: city.fullLabel,
  };
}
