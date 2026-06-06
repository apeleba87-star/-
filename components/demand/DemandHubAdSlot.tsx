import AffiliateAdSlot from "@/components/ads/AffiliateAdSlot";
import { isAdSlotRenderable, type HomeAdSlotWithCampaign } from "@/lib/ads-shared";
import { cn } from "@/lib/utils";

type Props = {
  slot: HomeAdSlotWithCampaign | null;
  variant?: "banner" | "card";
  className?: string;
};

/** 입주레이더 — 활성 슬롯만 배너/카드로 노출 */
export default function DemandHubAdSlot({ slot, variant = "banner", className }: Props) {
  if (!isAdSlotRenderable(slot)) return null;
  return <AffiliateAdSlot slot={slot} variant={variant} className={cn(className)} />;
}
