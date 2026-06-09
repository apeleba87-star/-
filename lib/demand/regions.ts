import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";

export const DEMAND_MAX_REGION_COMPARE = 3;

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
  /** 짧은 이름 (breadcrumb · 검색어) */
  label: string;
  /** 선택 목록 표시 */
  fullLabel: string;
  districts: DemandDistrictRef[];
};

export const DEMAND_REGIONS: DemandCityRegion[] = DEMAND_REGION_REGISTRY.map((city) => ({
  id: city.id,
  label: city.label,
  fullLabel: city.fullLabel,
  districts: city.districts.map(({ gu, slug }) => ({ gu, slug })),
}));

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

/** district RTMS·키워드 공통 저장 키 */
export function demandDistrictRegionKey(cityId: string, guSlug: string): string {
  return `${cityId}:${guSlug}`;
}

export function demandRegionSelectionKey(sel: DemandRegionSelection): string {
  if (sel.scope === "national") return "national";
  if (sel.scope === "city") return `city:${sel.cityId}`;
  return `district:${demandDistrictRegionKey(sel.cityId, sel.guSlug)}`;
}

/**
 * 표시 라벨
 * - 전국
 * - 서울특별시 (시 전체)
 * - 서울특별시 강남구 / 경상북도 안동시
 */
export function formatDemandRegionLabel(sel: DemandRegionSelection): string | null {
  if (sel.scope === "national") return "전국";
  const city = getDemandCity(sel.cityId);
  if (!city) return null;
  if (sel.scope === "city") return city.fullLabel;
  const district = getDemandDistrictRef(sel.cityId, sel.guSlug);
  if (!district) return null;
  return `${city.fullLabel} ${district.gu}`;
}

/** @deprecated formatDemandRegionLabel 사용 */
export function formatDemandRegionPath(cityId: string, guSlug: string): string | null {
  return formatDemandRegionLabel({ scope: "district", cityId, guSlug });
}

/** `demandRegionSelectionKey` 역파싱 — 입주레이더 region_key → 선택 */
export function parseDemandRegionKey(regionKey: string): DemandRegionSelection | null {
  if (regionKey === "national") return { scope: "national" };
  if (regionKey.startsWith("city:")) {
    return { scope: "city", cityId: regionKey.slice("city:".length) };
  }
  if (regionKey.startsWith("district:")) {
    const rest = regionKey.slice("district:".length);
    const colon = rest.indexOf(":");
    if (colon <= 0) return null;
    return {
      scope: "district",
      cityId: rest.slice(0, colon),
      guSlug: rest.slice(colon + 1),
    };
  }
  return null;
}

export function labelFromDemandRegionKey(regionKey: string): string {
  const sel = parseDemandRegionKey(regionKey);
  return sel ? (formatDemandRegionLabel(sel) ?? regionKey) : regionKey;
}
