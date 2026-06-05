import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";

/** @deprecated nationwide registry 사용 — 서울 25구 slug ↔ 구명 (하위 호환) */
export const SEOUL_GU_SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
  (DEMAND_REGION_REGISTRY.find((c) => c.id === "seoul")?.districts ?? []).map((d) => [d.slug, d.gu])
);

const SLUG_TO_DISTRICT = new Map<string, { cityId: string; gu: string }>();
const SEOUL_NAME_TO_SLUG = Object.fromEntries(
  Object.entries(SEOUL_GU_SLUG_TO_NAME).map(([slug, gu]) => [gu, slug])
) as Record<string, string>;

for (const city of DEMAND_REGION_REGISTRY) {
  for (const d of city.districts) {
    SLUG_TO_DISTRICT.set(`${city.id}:${d.slug}`, { cityId: city.id, gu: d.gu });
  }
}

export const SEOUL_GU_NAMES = Object.values(SEOUL_GU_SLUG_TO_NAME).sort((a, b) =>
  a.localeCompare(b, "ko")
);

export function guNameToSlug(gu: string, cityId = "seoul"): string | undefined {
  if (cityId === "seoul") return SEOUL_NAME_TO_SLUG[gu];
  const city = DEMAND_REGION_REGISTRY.find((c) => c.id === cityId);
  return city?.districts.find((d) => d.gu === gu)?.slug;
}

/** cityId 없이 slug만으로는 전국에서 유일하지 않을 수 있음 — 가능하면 cityId 전달 */
export function guSlugToName(slug: string, cityId?: string): string | undefined {
  if (cityId) return getDemandDistrictRefFromRegistry(cityId, slug)?.gu;
  if (slug in SEOUL_GU_SLUG_TO_NAME) return SEOUL_GU_SLUG_TO_NAME[slug];
  for (const city of DEMAND_REGION_REGISTRY) {
    const d = city.districts.find((x) => x.slug === slug);
    if (d) return d.gu;
  }
  return undefined;
}

function getDemandDistrictRefFromRegistry(cityId: string, slug: string) {
  return DEMAND_REGION_REGISTRY.find((c) => c.id === cityId)?.districts.find((d) => d.slug === slug);
}

export function isValidGuSlug(slug: string, cityId = "seoul"): boolean {
  if (cityId === "seoul") return slug in SEOUL_GU_SLUG_TO_NAME;
  return Boolean(getDemandDistrictRefFromRegistry(cityId, slug));
}

export function resolveDistrictByRegionKey(
  regionKey: string
): { cityId: string; gu: string; slug: string } | undefined {
  const hit = SLUG_TO_DISTRICT.get(regionKey);
  if (!hit) return undefined;
  const slug = regionKey.slice(regionKey.indexOf(":") + 1);
  return { cityId: hit.cityId, gu: hit.gu, slug };
}
