"use client";

import type { HomeAdSlotWithCampaign } from "@/lib/ads";
import AdPremiumBanner from "@/components/home/AdPremiumBanner";
import AdNativeCard from "@/components/home/AdNativeCard";
import AdScriptBlock from "./AdScriptBlock";

type Props = {
  slot: HomeAdSlotWithCampaign | null;
  variant?: "banner" | "card";
  className?: string;
};

/**
 * 슬롯 데이터에 따라 직접 수주 캠페인(배너/카드) 또는 구글/쿠팡 스크립트를 렌더링합니다.
 */
export default function AdSlotRenderer({ slot, variant = "card", className }: Props) {
  if (!slot?.enabled) return null;
  if (slot.campaign) {
    if (variant === "banner") return <AdPremiumBanner campaign={slot.campaign} slotKey={slot.key} />;
    return <AdNativeCard campaign={slot.campaign} slotKey={slot.key} />;
  }
  if (slot.script_content?.trim()) {
    return <AdScriptBlock scriptContent={slot.script_content} className={className} />;
  }
  return null;
}
