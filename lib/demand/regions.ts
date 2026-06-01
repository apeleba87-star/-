import { guNameToSlug, SEOUL_GU_NAMES } from "@/lib/demand/slugs";

export const DEMAND_MAX_REGION_COMPARE = 5;

export type DemandRegionSelection = {
  cityId: string;
  guSlug: string;
};

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
  return `${sel.cityId}:${sel.guSlug}`;
}

/** breadcrumb: 서울 > 강서구 */
export function formatDemandRegionPath(cityId: string, guSlug: string): string | null {
  const city = getDemandCity(cityId);
  const district = getDemandDistrictRef(cityId, guSlug);
  if (!city || !district) return null;
  return `${city.label} > ${district.gu}`;
}
