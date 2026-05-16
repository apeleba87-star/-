import { getActiveHomeAds, isAdSlotRenderable } from "@/lib/ads";
import AffiliateAdSlot from "@/components/ads/AffiliateAdSlot";

export default async function HomeBottomAd() {
  const ads = await getActiveHomeAds();
  if (!isAdSlotRenderable(ads.home_bottom)) return null;

  return (
    <div className="page-shell pb-10">
      <div className="mx-auto max-w-3xl">
        <AffiliateAdSlot slot={ads.home_bottom} variant="banner" />
      </div>
    </div>
  );
}
