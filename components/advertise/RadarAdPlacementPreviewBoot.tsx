"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  isRadarAdPlacementPreviewParam,
  RADAR_AD_PLACEMENT_PREVIEW_PARAM,
} from "@/lib/demand/radar-ad-placement-preview";

function RadarAdPlacementPreviewBootInner() {
  const searchParams = useSearchParams();
  const enabled = isRadarAdPlacementPreviewParam(
    searchParams.get(RADAR_AD_PLACEMENT_PREVIEW_PARAM)
  );

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.dataset.adPreview = "1";

    const blockNavigation = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          "a, button, [role='button'], input, select, textarea, label, [data-block-in-ad-preview]"
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", blockNavigation, true);
    document.addEventListener("submit", blockNavigation, true);

    return () => {
      delete document.documentElement.dataset.adPreview;
      document.removeEventListener("click", blockNavigation, true);
      document.removeEventListener("submit", blockNavigation, true);
    };
  }, [enabled]);

  return null;
}

/** `?ad_preview=1` — iframe 미리보기용 크롬 숨김 등 */
export default function RadarAdPlacementPreviewBoot() {
  return (
    <Suspense fallback={null}>
      <RadarAdPlacementPreviewBootInner />
    </Suspense>
  );
}
