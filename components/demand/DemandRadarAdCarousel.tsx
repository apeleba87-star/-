"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RadarAdInquiryLink from "@/components/advertise/RadarAdInquiryLink";
import RadarAdSlotCard from "@/components/demand/RadarAdSlotCard";
import {
  bumpRadarAdImpressionCount,
  initRadarAdImpressionCounts,
  pickFairRadarAdSlotId,
  radarAdSlotIndexById,
} from "@/lib/demand/radar-ad-fair-rotation";
import type { RadarAdBannerPayload } from "@/lib/demand/radar-ads-shared";
import { cn } from "@/lib/utils";

type Props = {
  banner: RadarAdBannerPayload;
  /** 광고 문의 미리보기 — 클릭·추적 비활성 */
  preview?: boolean;
  className?: string;
};

export default function DemandRadarAdCarousel({ banner, preview = false, className }: Props) {
  const slots = banner.slots;
  const count = slots.length;
  const countsRef = useRef<Record<string, number>>({});
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  const onImpressionRecorded = useCallback((slotId: string) => {
    countsRef.current = bumpRadarAdImpressionCount(countsRef.current, slotId);
  }, []);

  const pickAndShow = useCallback(() => {
    const nextId = pickFairRadarAdSlotId(slots, countsRef.current);
    if (nextId) setActiveSlotId(nextId);
  }, [slots]);

  const slotsKey = slots.map((s) => s.id).join(",");
  const dailyKey = JSON.stringify(banner.dailyImpressions ?? {});

  useEffect(() => {
    countsRef.current = initRadarAdImpressionCounts(slots, banner.dailyImpressions);
    setActiveSlotId(pickFairRadarAdSlotId(slots, countsRef.current));
  }, [banner.regionKey, banner.scope, dailyKey, slots, slotsKey, banner.dailyImpressions]);

  useEffect(() => {
    if (count <= 1) return;
    const ms = Math.max(5, banner.rotationSeconds) * 1000;
    const t = window.setInterval(pickAndShow, ms);
    return () => window.clearInterval(t);
  }, [banner.rotationSeconds, count, pickAndShow]);

  const active = slots.find((s) => s.id === activeSlotId) ?? slots[0];
  const index = active ? radarAdSlotIndexById(slots, active.id) : 0;

  if (!active) return null;

  const badgeLabel =
    banner.scope === "national"
      ? "전국 제휴"
      : banner.regionLabel
        ? `${banner.regionLabel} 지역 광고`
        : "지역 광고";

  return (
    <div className={cn("space-y-0", className)} data-radar-ad-scope={banner.scope}>
      <RadarAdSlotCard
        slot={active}
        badgeLabel={badgeLabel}
        preview={preview}
        onImpressionRecorded={preview ? undefined : onImpressionRecorded}
      />
      {count > 1 ? (
        <div className="-mt-px flex items-center justify-center gap-1.5 rounded-b-xl border border-t-0 border-slate-200/90 bg-slate-50/90 py-2.5">
          {slots.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSlotId(s.id)}
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
      {preview ? null : <RadarAdInquiryLink variant="bar" />}
    </div>
  );
}
