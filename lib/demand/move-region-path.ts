import { DEMAND_REGION_REGISTRY } from "@/lib/demand/region-registry.generated";
import { getDemandCity, getDemandDistrictRef } from "@/lib/demand/regions";

export type MoveRegionAlias = {
  cityId: string;
  guSlug: string;
  gu: string;
  cityLabel: string;
  cityFullLabel: string;
  regionSlug: string;
  path: string;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripDistrictSuffix(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/특별시$|광역시$|특례시$|자치시$|시$|군$|구$/u, "").trim() || trimmed;
}

function normalizeAlias(value: string): string {
  return safeDecode(value)
    .trim()
    .replace(/[._\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function compactAlias(gu: string): string {
  const parts = gu.split(/\s+/).filter(Boolean);
  return parts.map(stripDistrictSuffix).join("-");
}

function fullAlias(gu: string): string {
  return gu.split(/\s+/).filter(Boolean).join("-");
}

function cityPrefixedAlias(cityLabel: string, gu: string): string {
  return `${stripDistrictSuffix(cityLabel)}-${fullAlias(gu)}`;
}

function allCandidateAliases(cityLabel: string, gu: string): string[] {
  return [...new Set([compactAlias(gu), fullAlias(gu), cityPrefixedAlias(cityLabel, gu)].map(normalizeAlias))];
}

function primaryAlias(cityLabel: string, gu: string, duplicateCompactAliases: Set<string>): string {
  const compact = normalizeAlias(compactAlias(gu));
  if (duplicateCompactAliases.has(compact)) {
    return normalizeAlias(cityPrefixedAlias(cityLabel, gu));
  }
  return compact;
}

function duplicateCompactAliases(): Set<string> {
  const counts = new Map<string, number>();
  for (const city of DEMAND_REGION_REGISTRY) {
    for (const district of city.districts) {
      const alias = normalizeAlias(compactAlias(district.gu));
      counts.set(alias, (counts.get(alias) ?? 0) + 1);
    }
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([alias]) => alias));
}

export function moveRegionPath(regionSlug: string): string {
  return `/지역/${encodeURIComponent(regionSlug)}`;
}

export function moveRegionAliasForDistrict(cityId: string, guSlug: string): MoveRegionAlias | null {
  const city = getDemandCity(cityId);
  const district = getDemandDistrictRef(cityId, guSlug);
  if (!city || !district) return null;
  const regionSlug = primaryAlias(city.label, district.gu, duplicateCompactAliases());
  return {
    cityId,
    guSlug,
    gu: district.gu,
    cityLabel: city.label,
    cityFullLabel: city.fullLabel,
    regionSlug,
    path: moveRegionPath(regionSlug),
  };
}

export function resolveMoveRegionAlias(regionSlug: string): MoveRegionAlias | null {
  const normalized = normalizeAlias(regionSlug);
  if (!normalized) return null;
  const duplicates = duplicateCompactAliases();

  for (const city of DEMAND_REGION_REGISTRY) {
    for (const district of city.districts) {
      const candidates = allCandidateAliases(city.label, district.gu);
      if (!candidates.includes(normalized)) continue;
      const primary = primaryAlias(city.label, district.gu, duplicates);
      return {
        cityId: city.id,
        guSlug: district.slug,
        gu: district.gu,
        cityLabel: city.label,
        cityFullLabel: city.fullLabel,
        regionSlug: primary,
        path: moveRegionPath(primary),
      };
    }
  }

  return null;
}

export function listMoveRegionAliasesForDistricts(
  districts: { cityId: string; guSlug: string; lastModified: string }[]
): Array<MoveRegionAlias & { lastModified: string }> {
  return districts
    .map((district) => {
      const alias = moveRegionAliasForDistrict(district.cityId, district.guSlug);
      return alias ? { ...alias, lastModified: district.lastModified } : null;
    })
    .filter((alias): alias is MoveRegionAlias & { lastModified: string } => alias != null);
}

