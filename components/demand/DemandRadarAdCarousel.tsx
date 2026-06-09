"use client";

import { useEffect, useState } from "react";
import RadarAdSlotCard from "@/components/demand/RadarAdSlotCard";
import type { RadarAdBannerPayload } from "@/lib/demand/radar-ads-shared";
import { cn } from "@/lib/utils";

type Props = {
  banner: RadarAdBannerPayload;
  className?: string;
};

export default function DemandRadarAdCarousel({ banner, className }: Props) {
  const slots = banner.slots;
  const [index, setIndex] = useState(0);
  const count = slots.length;
  const active = slots[index] ?? slots[0];

  useEffect(() => {
    setIndex(0);
  }, [banner.regionKey, banner.scope, slots.map((s) => s.id).join(",")]);

  useEffect(() => {
    if (count <= 1) return;
    const ms = Math.max(5, banner.rotationSeconds) * 1000;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, ms);
    return () => window.clearInterval(t);
  }, [banner.rotationSeconds, count]);

  if (!active) return null;

  const badgeLabel =
    banner.scope === "national"
      ? "전국 제휴"
      : banner.regionLabel
        ? `${banner.regionLabel} 지역 광고`
        : "지역 광고";

  return (
    <div className={cn("space-y-0", className)} data-radar-ad-scope={banner.scope}>
      <RadarAdSlotCard slot={active} badgeLabel={badgeLabel} />
      {count > 1 ? (
        <div className="-mt-px flex items-center justify-center gap-1.5 rounded-b-xl border border-t-0 border-slate-200/90 bg-slate-50/90 py-2.5">
          {slots.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-4 bg-slate-700" : "w-1.5 bg-slate-300 hover:bg-slate-400"
              )}
              aria-label={`광고 ${i + 1}`}
              aria-pressed={i === index}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
