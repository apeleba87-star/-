import type { RadarAdScope } from "@/lib/demand/radar-ads-shared";

export const RADAR_AD_PLACEMENT_PREVIEW_PARAM = "ad_preview";
export const RADAR_AD_PLACEMENT_PREVIEW_SCOPE_PARAM = "ad_preview_scope";

export type RadarAdPlacementPreviewScopeFilter = "all" | "national" | "regional";

export function isRadarAdPlacementPreviewParam(
  value: string | null | undefined
): boolean {
  return value === "1" || value === "true";
}

export function isRadarAdPlacementPreviewSearchParams(
  params: Record<string, string | string[] | undefined>
): boolean {
  const raw = params[RADAR_AD_PLACEMENT_PREVIEW_PARAM];
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return isRadarAdPlacementPreviewParam(value);
}

export function parseRadarAdPlacementPreviewScopeFilter(
  value: string | null | undefined
): RadarAdPlacementPreviewScopeFilter {
  if (value === "national" || value === "regional") return value;
  return "all";
}

export function isRadarAdPlacementScopeHighlighted(
  adScope: RadarAdScope,
  filter: RadarAdPlacementPreviewScopeFilter
): boolean {
  return filter === "all" || filter === adScope;
}

export function radarAdPlacementDummyLabel(scope: RadarAdScope): string {
  return scope === "national" ? "[전국 배너 광고]" : "[지역 배너 광고]";
}

export function appendRadarAdPlacementPreviewParams(
  href: string,
  scopeFilter: RadarAdPlacementPreviewScopeFilter
): string {
  const [path, query = ""] = href.split("?");
  const sp = new URLSearchParams(query);
  sp.set(RADAR_AD_PLACEMENT_PREVIEW_PARAM, "1");
  if (scopeFilter === "all") {
    sp.delete(RADAR_AD_PLACEMENT_PREVIEW_SCOPE_PARAM);
  } else {
    sp.set(RADAR_AD_PLACEMENT_PREVIEW_SCOPE_PARAM, scopeFilter);
  }
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}
