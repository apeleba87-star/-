"use client";

import type { AdSlotType, HomeAdSlotWithCampaign } from "@/lib/ads-shared";
import { isAdSlotRenderable } from "@/lib/ads-shared";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";

const COUPANG_DISCLOSURE =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

type Props = {
  slot: HomeAdSlotWithCampaign | null;
  variant?: "banner" | "card";
  className?: string;
};

function disclosureForType(slotType: AdSlotType): string | null {
  if (slotType === "coupang" || slotType === "coupang_api") return COUPANG_DISCLOSURE;
  if (slotType === "google") return "이 영역에는 제휴·광고가 게재될 수 있습니다.";
  return null;
}

/**
 * 제휴·스크립트 광고는 고지 문구와 함께 배너 형태로 노출합니다.
 */
export default function AffiliateAdSlot({ slot, variant = "banner", className }: Props) {
  if (!isAdSlotRenderable(slot)) return null;

  const effectiveType: AdSlotType = slot!.campaign ? "direct" : slot!.slot_type;
  const disclosure = disclosureForType(effectiveType);
  const useBanner =
    effectiveType === "coupang" ||
    effectiveType === "coupang_api" ||
    effectiveType === "google" ||
    variant === "banner";

  return (
    <aside
      className={`rounded-2xl border border-slate-200/90 bg-slate-50/80 ${className ?? ""}`}
      aria-label="광고"
      data-hide-in-ad-preview
      data-ad-slot={slot!.key}
    >
      <div className="flex flex-col gap-1 border-b border-slate-200/80 bg-white/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">광고</span>
        {disclosure ? <span className="text-[10px] leading-snug text-slate-500">{disclosure}</span> : null}
      </div>
      <div
        className={`p-3 ${
          effectiveType === "coupang" || effectiveType === "coupang_api" ? "overflow-visible" : ""
        }`}
      >
        <AdSlotRenderer slot={slot} variant={useBanner ? "banner" : "card"} />
      </div>
    </aside>
  );
}
