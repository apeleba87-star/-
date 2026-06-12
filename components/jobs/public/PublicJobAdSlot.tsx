import AffiliateAdSlot from "@/components/ads/AffiliateAdSlot";
import { isAdSlotRenderable, type HomeAdSlotWithCampaign } from "@/lib/ads-shared";
import { cn } from "@/lib/utils";

type Props = {
  slot: HomeAdSlotWithCampaign | null;
  className?: string;
};

/** 채용 공고(워크넷) — 활성 슬롯만 노출 */
export default function PublicJobAdSlot({ slot, className }: Props) {
  if (!isAdSlotRenderable(slot)) return null;
  return <AffiliateAdSlot slot={slot} variant="banner" className={cn(className)} />;
}
