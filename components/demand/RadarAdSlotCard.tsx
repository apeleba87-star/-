"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import type { RadarAdSlot } from "@/lib/demand/radar-ads-shared";
import RadarAdCroppedImage from "@/components/demand/RadarAdCroppedImage";
import { useRadarAdViewableImpression } from "@/components/demand/useRadarAdViewableImpression";
import { trackRadarAdEvent } from "@/lib/demand/radar-ad-tracking";
import { radarAdCtaModeFromUrl } from "@/lib/demand/radar-ads-cta";
import { cn } from "@/lib/utils";

export type RadarAdSlotCardProps = {
  slot: RadarAdSlot;
  badgeLabel: string;
  /** 관리자 미리보기 — 클릭·외부 링크·추적 비활성 */
  preview?: boolean;
  /** 뷰어블 impression 기록 시 — 로테이션 균형 카운트 */
  onImpressionRecorded?: (slotId: string) => void;
  className?: string;
};

function slotHref(slot: RadarAdSlot): string {
  const url = slot.ctaUrl.trim();
  if (!url || url === "#") return "#";
  if (/^https?:\/\//i.test(url) || url.startsWith("tel:") || url.startsWith("mailto:")) {
    return url;
  }
  if (url.startsWith("/")) return url;
  return `https://${url}`;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function RadarAdBannerImage({ slot }: { slot: RadarAdSlot }) {
  return (
    <div className="relative aspect-[3/1] w-full bg-slate-200/60">
      <RadarAdCroppedImage
        src={slot.imageUrl!}
        crop={slot.imageCrop}
        className="h-full w-full"
      />
    </div>
  );
}

function RadarAdTextOnlyBody({
  slot,
  titleFallback = "제목을 입력하세요",
}: {
  slot: RadarAdSlot;
  titleFallback?: string;
}) {
  const title = slot.title.trim() || titleFallback;
  const cta = slot.ctaText.trim() || "자세히";

  return (
    <div className="space-y-2 p-4">
      {slot.advertiserName ? (
        <p className="truncate text-xs font-semibold text-slate-700">{slot.advertiserName}</p>
      ) : null}
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{title}</p>
      {slot.description ? (
        <p className="line-clamp-2 text-xs leading-snug text-slate-600">{slot.description}</p>
      ) : null}
      <span className="inline-flex rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">
        {cta}
      </span>
    </div>
  );
}

export function RadarAdSlotCardBody({
  slot,
  titleFallback,
}: {
  slot: RadarAdSlot;
  titleFallback?: string;
}) {
  if (slot.imageUrl) {
    return <RadarAdBannerImage slot={slot} />;
  }
  return <RadarAdTextOnlyBody slot={slot} titleFallback={titleFallback} />;
}

export default function RadarAdSlotCard({
  slot,
  badgeLabel,
  preview = false,
  onImpressionRecorded,
  className,
}: RadarAdSlotCardProps) {
  const pathname = usePathname();
  const href = slotHref(slot);
  const external = isExternalHref(href);
  const hasImage = Boolean(slot.imageUrl);
  const trackEnabled = !preview && Boolean(slot.id);
  const trackRef = useRef<HTMLDivElement>(null);
  useRadarAdViewableImpression(trackRef, slot.id, trackEnabled, onImpressionRecorded);

  const linkClass = cn(
    "block outline-none transition-colors",
    preview
      ? "cursor-default"
      : "hover:opacity-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
  );

  function onAdClick() {
    if (preview || !slot.id) return;
    const mode = radarAdCtaModeFromUrl(slot.ctaUrl);
    void trackRadarAdEvent({
      event_type: mode === "phone" ? "phone_click" : "click",
      slot_id: slot.id,
      page_path: pathname ?? undefined,
    });
  }

  return (
    <aside
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/90 shadow-sm ring-1 ring-slate-200/50",
        className
      )}
      aria-label={preview ? "광고 미리보기" : "광고"}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-100/70 px-3 py-2">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Sponsored
        </span>
        <p className="min-w-0 truncate text-right text-xs font-semibold text-slate-700">
          {badgeLabel}
          {hasImage && slot.advertiserName ? (
            <span className="font-medium text-slate-500"> · {slot.advertiserName}</span>
          ) : null}
        </p>
      </div>
      {preview ? (
        <div className={linkClass}>
          <div ref={trackRef}>
            <RadarAdSlotCardBody slot={slot} />
          </div>
        </div>
      ) : (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer sponsored" : undefined}
          className={linkClass}
          onClick={onAdClick}
        >
          <div ref={trackRef}>
            <RadarAdSlotCardBody slot={slot} />
          </div>
        </a>
      )}
    </aside>
  );
}
