"use client";

import type { RadarAdScope } from "@/lib/demand/radar-ads-shared";
import { radarAdPlacementDummyLabel } from "@/lib/demand/radar-ad-placement-preview";
import { cn } from "@/lib/utils";

type Props = {
  scope: RadarAdScope;
  className?: string;
};

/** 광고 문의 iframe (`?ad_preview=1`) — 실제 광고·제휴 대신 위치만 표시 */
export default function RadarAdPlacementDummyBanner({ scope, className }: Props) {
  const isNational = scope === "national";

  return (
    <aside
      className={cn(
        "overflow-hidden rounded-xl border-2 border-dashed bg-slate-50 shadow-sm",
        isNational ? "border-teal-300" : "border-emerald-300",
        className
      )}
      aria-label={radarAdPlacementDummyLabel(scope)}
    >
      <div
        className={cn(
          "flex aspect-[3/1] w-full items-center justify-center px-4",
          isNational ? "bg-teal-50/80" : "bg-emerald-50/80"
        )}
      >
        <p
          className={cn(
            "text-center text-sm font-bold tracking-tight sm:text-base",
            isNational ? "text-teal-800" : "text-emerald-800"
          )}
        >
          {radarAdPlacementDummyLabel(scope)}
        </p>
      </div>
    </aside>
  );
}
