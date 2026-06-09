"use client";

import { useEffect, useState } from "react";
import DemandHubAdSlot from "@/components/demand/DemandHubAdSlot";
import DemandRadarAdCarousel from "@/components/demand/DemandRadarAdCarousel";
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
  const [banner, setBanner] = useState<RadarAdBannerPayload | null>(null);
  const [resolved, setResolved] = useState(false);
  const keysKey = regionKeys.join("\0");
  const showFallback = resolved && !banner && isAdSlotRenderable(fallbackSlot);

  useEffect(() => {
    const keys = keysKey ? keysKey.split("\0") : [];
    if (keys.length === 0) {
      setBanner(null);
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
            setResolved(true);
            return;
          }
        } catch {
          // 다음 후보 시도
        }
      }
      if (!cancelled) {
        setBanner(null);
        setResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keysKey]);

  if (regionKeys.length === 0) return null;
  if (banner) {
    return <DemandRadarAdCarousel banner={banner} className={cn(className)} />;
  }
  if (!resolved) return null;
  if (showFallback) {
    return <DemandHubAdSlot slot={fallbackSlot ?? null} variant="banner" className={cn(className)} />;
  }
  return null;
}
