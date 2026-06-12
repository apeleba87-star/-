"use client";

import { useEffect, useState } from "react";
import DemandRadarAdCarousel from "@/components/demand/DemandRadarAdCarousel";
import RadarAdPlacementDummyBanner from "@/components/demand/RadarAdPlacementDummyBanner";
import RadarAdPlacementPreviewFrame from "@/components/demand/RadarAdPlacementPreviewFrame";
import { useRadarAdPlacementPreview } from "@/components/demand/useRadarAdPlacementPreview";
import type { RadarAdBannerPayload } from "@/lib/demand/radar-ads-shared";

type Props = {
  className?: string;
};

export default function DemandRadarNationalAd({ className }: Props) {
  const { enabled: previewMode, isHighlighted } = useRadarAdPlacementPreview();
  const [banner, setBanner] = useState<RadarAdBannerPayload | null>(null);

  useEffect(() => {
    if (previewMode) return;
    let cancelled = false;
    void fetch("/api/demand/radar-ads/national", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { banner: RadarAdBannerPayload | null }) => {
        if (!cancelled) setBanner(data.banner);
      })
      .catch(() => {
        if (!cancelled) setBanner(null);
      });
    return () => {
      cancelled = true;
    };
  }, [previewMode]);

  if (previewMode) {
    return (
      <RadarAdPlacementPreviewFrame
        scope="national"
        enabled
        highlighted={isHighlighted("national")}
        className={className}
      >
        <RadarAdPlacementDummyBanner scope="national" />
      </RadarAdPlacementPreviewFrame>
    );
  }

  if (!banner?.slots.length) return null;

  return <DemandRadarAdCarousel banner={banner} className={className} />;
}
