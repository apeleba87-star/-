"use client";

import { useEffect, useRef, type RefObject } from "react";
import { usePathname } from "next/navigation";
import {
  canSendRadarAdImpression,
  markRadarAdImpressionSent,
  RADAR_AD_VIEWABLE_MS,
  RADAR_AD_VIEWABLE_RATIO,
  trackRadarAdEvent,
} from "@/lib/demand/radar-ad-tracking";

function visibleRatio(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0 || rect.width <= 0) return 0;
  const vh = window.innerHeight;
  const visibleH = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
  const visibleW = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  if (visibleH <= 0 || visibleW <= 0) return 0;
  return (visibleH * visibleW) / (rect.height * rect.width);
}

export function useRadarAdViewableImpression(
  containerRef: RefObject<HTMLElement | null>,
  slotId: string | undefined,
  enabled: boolean
) {
  const pathname = usePathname();
  const firedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    firedRef.current = false;
  }, [slotId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !slotId || !enabled) return;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const tryFire = () => {
      if (firedRef.current || !canSendRadarAdImpression(slotId)) return;
      firedRef.current = true;
      markRadarAdImpressionSent(slotId);
      void trackRadarAdEvent({
        event_type: "impression",
        slot_id: slotId,
        page_path: pathname ?? undefined,
      });
    };

    const scheduleIfVisible = () => {
      if (firedRef.current || timerRef.current) return;
      if (visibleRatio(el) < RADAR_AD_VIEWABLE_RATIO) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (visibleRatio(el) >= RADAR_AD_VIEWABLE_RATIO) {
          tryFire();
        }
      }, RADAR_AD_VIEWABLE_MS);
    };

    scheduleIfVisible();

    const observer = new IntersectionObserver(
      () => {
        if (visibleRatio(el) < RADAR_AD_VIEWABLE_RATIO) {
          clearTimer();
          return;
        }
        scheduleIfVisible();
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], rootMargin: "0px" }
    );

    observer.observe(el);

    const onScroll = () => {
      if (firedRef.current) return;
      if (visibleRatio(el) >= RADAR_AD_VIEWABLE_RATIO) {
        scheduleIfVisible();
      } else {
        clearTimer();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      clearTimer();
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [containerRef, slotId, enabled, pathname]);
}
