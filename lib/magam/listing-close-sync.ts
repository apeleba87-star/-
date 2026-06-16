const STORAGE_KEY = "magam_closed_listing_ids_v1";

export function markMagamListingClosedLocally(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const prev = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
    if (prev.includes(id)) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...prev, id]));
  } catch {
    /* ignore */
  }
}

export function readMagamLocallyClosedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function clearMagamLocallyClosedId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = (JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as string[]).filter(
      (x) => x !== id
    );
    if (next.length === 0) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
