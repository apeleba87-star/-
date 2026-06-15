"use client";

import { useEffect, useState } from "react";

import DemandRadarAdCarousel from "@/components/demand/DemandRadarAdCarousel";
import type { RadarAdBannerPayload } from "@/lib/demand/radar-ads-shared";

type NationalProps = {
  pagePath: string;
  compact?: boolean;
  className?: string;
};

export function MagamRadarNationalBanner({ pagePath, compact, className }: NationalProps) {
  const [banner, setBanner] = useState<RadarAdBannerPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/magam/radar-ads/national", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { banner: RadarAdBannerPayload | null }) => {
        if (!cancelled && data.banner?.slots?.length) setBanner(data.banner);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pagePath]);

  if (!banner) return null;
  return <DemandRadarAdCarousel banner={banner} className={className} />;
}

type RegionalProps = {
  regionKeys: string[];
  pagePath: string;
  compact?: boolean;
  className?: string;
};

export function MagamRadarRegionalBanner({ regionKeys, pagePath, className }: RegionalProps) {
  const [banner, setBanner] = useState<RadarAdBannerPayload | null>(null);
  const keys = regionKeys.join(",");

  useEffect(() => {
    if (!regionKeys.length) return;
    let cancelled = false;

    async function load() {
      for (const key of regionKeys) {
        const res = await fetch(
          `/api/magam/radar-ads/regional?region=${encodeURIComponent(key)}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as { banner: RadarAdBannerPayload | null };
        if (cancelled) return;
        if (data.banner?.slots?.length) {
          setBanner(data.banner);
          return;
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [keys, pagePath, regionKeys]);

  if (!banner) return null;
  return <DemandRadarAdCarousel banner={banner} className={className} />;
}
