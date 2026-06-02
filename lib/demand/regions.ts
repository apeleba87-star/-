import { guNameToSlug, SEOUL_GU_NAMES } from "@/lib/demand/slugs";

export const DEMAND_MAX_REGION_COMPARE = 5;

export type DemandRegionScope = "national" | "city" | "district";

export type DemandRegionSelection =
  | { scope: "national" }
  | { scope: "city"; cityId: string }
  | { scope: "district"; cityId: string; guSlug: string };

export type DemandDistrictRef = {
  slug: string;
  gu: string;
};

export type DemandCityRegion = {
  id: string;
  /** 짧은 이름 (breadcrumb) */
  label: string;
  /** 선택 목록 표시 */
  fullLabel: string;
  districts: DemandDistrictRef[];
};

export const DEMAND_REGIONS: DemandCityRegion[] = [
  {
    id: "seoul",
    label: "서울",
    fullLabel: "서울특별시",
    districts: SEOUL_GU_NAMES.flatMap((gu) => {
      const slug = guNameToSlug(gu);
      return slug ? [{ gu, slug }] : [];
    }),
  },
];

export function getDemandCity(cityId: string): DemandCityRegion | undefined {
  return DEMAND_REGIONS.find((c) => c.id === cityId);
}

export function getDemandDistrictRef(
  cityId: string,
  guSlug: string
): DemandDistrictRef | undefined {
  const city = getDemandCity(cityId);
  return city?.districts.find((d) => d.slug === guSlug);
}

export function demandRegionSelectionKey(sel: DemandRegionSelection): string {
  if (sel.scope === "national") return "national";
  if (sel.scope === "city") return `city:${sel.cityId}`;
  return `district:${sel.cityId}:${sel.guSlug}`;
}

/** breadcrumb: 전국 | 서울특별시 | 서울 > 강서구 */
export function formatDemandRegionLabel(sel: DemandRegionSelection): string | null {
  if (sel.scope === "national") return "전국";
  const city = getDemandCity(sel.cityId);
  if (!city) return null;
  if (sel.scope === "city") return city.fullLabel;
  const district = getDemandDistrictRef(sel.cityId, sel.guSlug);
  if (!district) return null;
  return `${city.label} > ${district.gu}`;
}

/** @deprecated formatDemandRegionLabel 사용 */
export function formatDemandRegionPath(cityId: string, guSlug: string): string | null {
  return formatDemandRegionLabel({ scope: "district", cityId, guSlug });
}
