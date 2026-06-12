"use client";

import DemandRadarNationalAd from "@/components/demand/DemandRadarNationalAd";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export default function PublicJobRadarNationalBanner({ className }: Props) {
  return <DemandRadarNationalAd className={cn(className)} />;
}
