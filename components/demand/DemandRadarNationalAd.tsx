"use client";

import { useEffect, useState } from "react";
import DemandRadarAdCarousel from "@/components/demand/DemandRadarAdCarousel";
import type { RadarAdBannerPayload } from "@/lib/demand/radar-ads-shared";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export default function DemandRadarNationalAd({ className }: Props) {
  const [banner, setBanner] = useState<RadarAdBannerPayload | null>(null);

  useEffect(() => {
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
  }, []);

  if (!banner?.slots.length) return null;
  return <DemandRadarAdCarousel banner={banner} className={cn(className)} />;
}
