const STORAGE_KEY = "magam_recent_regions_v1";
const MAX = 1;

export type MagamRecentRegion = {
  cityId: string;
  districtSlug: string;
};

function fromKey(key: string): MagamRecentRegion | null {
  const i = key.indexOf(":");
  if (i <= 0) return null;
  return { cityId: key.slice(0, i), districtSlug: key.slice(i + 1) };
}

export function loadMagamRecentRegions(): MagamRecentRegion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const keys = JSON.parse(raw) as string[];
    if (!Array.isArray(keys)) return [];
    return keys.map(fromKey).filter((r): r is MagamRecentRegion => r !== null).slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushMagamRecentRegion(cityId: string, districtSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    const entry = `${cityId}:${districtSlug}`;
    const prev = loadMagamRecentRegions()
      .map((r) => `${r.cityId}:${r.districtSlug}`)
      .filter((k) => k !== entry);
    const next = [entry, ...prev].slice(0, MAX);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
