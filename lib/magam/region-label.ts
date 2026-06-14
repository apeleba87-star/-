import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";

/** 입주레이더 시·군·구 → 마감 앱 표기 (예: 서울 강남구, 경북 안동시) */
export function formatMagamRegionLabel(cityId: string, districtSlug: string): string {
  const city = DEMAND_REGION_REGISTRY.find((c) => c.id === cityId);
  if (!city) return districtSlug;
  const district = city.districts.find((d) => d.slug === districtSlug);
  if (!district) return districtSlug;
  return `${city.label} ${district.gu}`;
}

export function parseMagamRegionLabel(label: string): { cityLabel: string; gu: string } | null {
  const trimmed = label.trim();
  for (const city of DEMAND_REGION_REGISTRY) {
    const prefix = `${city.label} `;
    if (trimmed.startsWith(prefix)) {
      return { cityLabel: city.label, gu: trimmed.slice(prefix.length) };
    }
  }
  return null;
}
