"use client";

import type { ReactNode } from "react";
import type { RadarAdScope } from "@/lib/demand/radar-ads-shared";
import { cn } from "@/lib/utils";

type Props = {
  scope: RadarAdScope;
  enabled: boolean;
  highlighted: boolean;
  children: ReactNode;
  className?: string;
};

export default function RadarAdPlacementPreviewFrame({
  scope,
  enabled,
  highlighted,
  children,
  className,
}: Props) {
  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  const isNational = scope === "national";

  return (
    <div
      className={cn("relative", className)}
      data-radar-ad-placement={scope}
    >
      {highlighted ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 rounded-xl ring-4 ring-offset-2",
            isNational ? "ring-teal-500" : "ring-emerald-500"
          )}
          aria-hidden
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-white/55"
          aria-hidden
        />
      )}
      <div className={cn(!highlighted && "opacity-45")}>{children}</div>
    </div>
  );
}
