"use client";

import DemandRadarRegionalAd from "@/components/demand/DemandRadarRegionalAd";
import { cn } from "@/lib/utils";

type Props = {
  regionKeys: string[];
  className?: string;
};

export default function PublicJobRadarRegionalBanner({ regionKeys, className }: Props) {
  if (regionKeys.length === 0) return null;

  return (
    <DemandRadarRegionalAd
      regionKeys={regionKeys}
      fallbackSlot={null}
      className={cn(className)}
    />
  );
}
