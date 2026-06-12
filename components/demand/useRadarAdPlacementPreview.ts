"use client";

import { useSearchParams } from "next/navigation";
import {
  isRadarAdPlacementPreviewParam,
  isRadarAdPlacementScopeHighlighted,
  parseRadarAdPlacementPreviewScopeFilter,
  RADAR_AD_PLACEMENT_PREVIEW_PARAM,
  RADAR_AD_PLACEMENT_PREVIEW_SCOPE_PARAM,
  type RadarAdPlacementPreviewScopeFilter,
} from "@/lib/demand/radar-ad-placement-preview";
import type { RadarAdScope } from "@/lib/demand/radar-ads-shared";

export function useRadarAdPlacementPreview() {
  const searchParams = useSearchParams();
  const enabled = isRadarAdPlacementPreviewParam(
    searchParams.get(RADAR_AD_PLACEMENT_PREVIEW_PARAM)
  );
  const scopeFilter: RadarAdPlacementPreviewScopeFilter = parseRadarAdPlacementPreviewScopeFilter(
    searchParams.get(RADAR_AD_PLACEMENT_PREVIEW_SCOPE_PARAM)
  );

  function isHighlighted(scope: RadarAdScope): boolean {
    if (!enabled) return false;
    return isRadarAdPlacementScopeHighlighted(scope, scopeFilter);
  }

  return { enabled, scopeFilter, isHighlighted };
}
