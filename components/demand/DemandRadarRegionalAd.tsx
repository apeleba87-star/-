"use client";

import { useEffect, useState } from "react";
import DemandHubAdSlot from "@/components/demand/DemandHubAdSlot";
import DemandRadarAdCarousel from "@/components/demand/DemandRadarAdCarousel";
import RadarAdPlacementDummyBanner from "@/components/demand/RadarAdPlacementDummyBanner";
import RadarAdPlacementPreviewFrame from "@/components/demand/RadarAdPlacementPreviewFrame";
import { useRadarAdPlacementPreview } from "@/components/demand/useRadarAdPlacementPreview";
import { isAdSlotRenderable, type HomeAdSlotWithCampaign } from "@/lib/ads-shared";
import type { RadarAdBannerPayload } from "@/lib/demand/radar-ads-shared";
import { cn } from "@/lib/utils";

type Props = {
  /** 시도 순서대로 API 조회 — 첫 매칭 배너 노출 */
  regionKeys: string[];
  /** 직거래 없을 때 애드센스·쿠팡 등 (`home_ad_slots.radar_regional_fallback`) */
  fallbackSlot?: HomeAdSlotWithCampaign | null;
  className?: string;
};

async function fetchRegionalBanner(regionKey: string): Promise<RadarAdBannerPayload | null> {
  const res = await fetch(`/api/demand/radar-ads/regional?region=${encodeURIComponent(regionKey)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { banner: RadarAdBannerPayload | null };
  return data.banner?.slots.length ? data.banner : null;
}

export default function DemandRadarRegionalAd({ regionKeys, fallbackSlot, className }: Props) {
  const { enabled: previewMode, isHighlighted } = useRadarAdPlacementPreview();
  const [banner, setBanner] = useState<RadarAdBannerPayload | null>(null);
  /** banner가 로드된 시점의 regionKeys — 불일치 시 즉시 숨김(이전 지역 잔상 방지) */
  const [bannerKeysKey, setBannerKeysKey] = useState("");
  const [resolved, setResolved] = useState(false);
  const keysKey = regionKeys.join("\0");
  const activeBanner = banner && bannerKeysKey === keysKey ? banner : null;
  const showFallback =
    resolved && bannerKeysKey === keysKey && !activeBanner && isAdSlotRenderable(fallbackSlot);

  useEffect(() => {
    if (previewMode) return;

    const keys = keysKey ? keysKey.split("\0") : [];
    if (keys.length === 0) {
      setBanner(null);
      setBannerKeysKey("");
      setResolved(false);
      return;
    }

    let cancelled = false;
    setResolved(false);

    void (async () => {
      for (const regionKey of keys) {
        try {
          const found = await fetchRegionalBanner(regionKey);
          if (cancelled) return;
          if (found) {
            setBanner(found);
            setBannerKeysKey(keysKey);
            setResolved(true);
            return;
          }
        } catch {
          // 다음 후보 시도
        }
      }
      if (!cancelled) {
        setBanner(null);
        setBannerKeysKey(keysKey);
        setResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keysKey, previewMode]);

  if (previewMode) {
    if (regionKeys.length === 0) return null;
    return (
      <RadarAdPlacementPreviewFrame
        scope="regional"
        enabled
        highlighted={isHighlighted("regional")}
        className={className}
      >
        <RadarAdPlacementDummyBanner scope="regional" />
      </RadarAdPlacementPreviewFrame>
    );
  }

  if (regionKeys.length === 0) return null;
  if (activeBanner) {
    return <DemandRadarAdCarousel banner={activeBanner} className={cn(className)} />;
  }
  if (!resolved || bannerKeysKey !== keysKey) return null;
  if (showFallback) {
    return <DemandHubAdSlot slot={fallbackSlot ?? null} variant="banner" className={cn(className)} />;
  }
  return null;
}
