import MonetizationSectionTabs from "@/components/admin/MonetizationSectionTabs";
import RadarAdsSubNav from "@/components/admin/RadarAdsSubNav";
import { createServerSupabase } from "@/lib/supabase-server";
import { loadRadarAdsAdminBundle } from "@/lib/demand/radar-ads-admin-load";
import RadarAdsManager from "../RadarAdsManager";

type SearchParams = Promise<{ banner?: string; slot?: string; section?: string }>;

function resolveInitialScope(
  section: string | undefined,
  bannerId: string | null,
  nationalId: string | null,
  regionalIds: string[]
): "national" | "regional" {
  if (section === "national" || section === "regional") return section;
  if (bannerId) {
    if (bannerId === nationalId) return "national";
    if (regionalIds.includes(bannerId)) return "regional";
  }
  return "national";
}

export default async function AdminRadarAdsManagePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabase();
  const bundle = await loadRadarAdsAdminBundle(supabase);

  const initialBannerId = params.banner?.trim() || null;
  const slotNum = params.slot ? Number(params.slot) : NaN;
  const initialSlotIndex =
    Number.isInteger(slotNum) && slotNum >= 1 && slotNum <= 3 ? slotNum : undefined;
  const initialScope = resolveInitialScope(
    params.section?.trim(),
    initialBannerId,
    bundle.nationalBanner?.id ?? null,
    bundle.regionalBanners.map((b) => b.id)
  );

  return (
    <div className="space-y-6">
      <MonetizationSectionTabs />
      <RadarAdsSubNav />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">입주레이더 광고 관리</h1>
        <p className="mt-1 text-sm text-slate-600">
          전체 광고·지역 광고 탭에서 슬롯을 편집합니다. 입금 확인 후 게재 상태를 active로 바꾸세요.
        </p>
      </div>
      <RadarAdsManager
        nationalBanner={bundle.nationalBanner}
        nationalSlots={bundle.nationalSlots}
        regionalBanners={bundle.regionalBanners}
        regionalSlotsByBannerId={bundle.regionalSlotsByBannerId}
        today={bundle.today}
        initialRegionalBannerId={initialBannerId}
        initialSlotIndex={initialSlotIndex}
        initialScope={initialScope}
      />
    </div>
  );
}
