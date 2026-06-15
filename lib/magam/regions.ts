import {
  DEMAND_REGION_REGISTRY,
  type DemandRegistryCity,
  type DemandRegistryDistrict,
} from "@/lib/demand/region-registry.generated";

/** Flutter region_registry.g.dart 와 동일 목록 */
export const MAGAM_REGION_CITIES: DemandRegistryCity[] = [...DEMAND_REGION_REGISTRY].sort(
  (a, b) => {
    if (a.id === "seoul") return -1;
    if (b.id === "seoul") return 1;
    return a.label.localeCompare(b.label, "ko");
  }
);

export const MAGAM_DEFAULT_CITY_ID = "seoul";

export function magamCityById(cityId: string): DemandRegistryCity | undefined {
  return MAGAM_REGION_CITIES.find((c) => c.id === cityId);
}

export function magamDistrictBySlug(
  city: DemandRegistryCity,
  districtSlug: string
): DemandRegistryDistrict | undefined {
  return city.districts.find((d) => d.slug === districtSlug);
}

/** 예: 서울 강남구 */
export function magamRegionDisplayLabel(cityId: string, districtSlug: string): string {
  const city = magamCityById(cityId);
  if (!city) return "";
  const district = magamDistrictBySlug(city, districtSlug);
  if (!district) return city.label;
  return `${city.label} ${district.gu}`;
}

export function magamDefaultDistrictSlug(cityId: string): string {
  const city = magamCityById(cityId);
  return city?.districts[0]?.slug ?? "gangnam-gu";
}
