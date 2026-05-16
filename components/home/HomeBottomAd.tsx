import { getActiveHomeBottomAd, isAdSlotRenderable } from "@/lib/ads";
import AffiliateAdSlot from "@/components/ads/AffiliateAdSlot";

export default async function HomeBottomAd() {
  const slot = await getActiveHomeBottomAd();
  if (!isAdSlotRenderable(slot)) return null;

  return (
    <div className="page-shell pb-10">
      <div className="mx-auto max-w-3xl">
        <AffiliateAdSlot slot={slot} variant="banner" />
      </div>
    </div>
  );
}
