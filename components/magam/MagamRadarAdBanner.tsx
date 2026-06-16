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
    void fetch("/api/magam/radar-ads/national")
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
    if (!regionKeys.length) {
      setBanner(null);
      return;
    }

    let cancelled = false;
    setBanner(null);

    async function load() {
      const results = await Promise.all(
        regionKeys.map(async (key) => {
          try {
            const res = await fetch(
              `/api/magam/radar-ads/regional?region=${encodeURIComponent(key)}`
            );
            const data = (await res.json()) as { banner: RadarAdBannerPayload | null };
            return data.banner?.slots?.length ? data.banner : null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setBanner(results.find((banner) => banner !== null) ?? null);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [keys, pagePath, regionKeys]);

  if (!banner) return null;
  return <DemandRadarAdCarousel key={keys} banner={banner} className={className} />;
}
