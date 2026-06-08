import { notFound, permanentRedirect } from "next/navigation";
import {
  demandRegionSeoPath,
  findCityIdForDistrictSlug,
} from "@/lib/demand/region-seo-path";

type Props = { params: Promise<{ cityId: string }> };

/** legacy `/demand/region/{guSlug}` → `/demand/region/{cityId}/{guSlug}` */
export default async function DemandRegionLegacyRedirectPage({ params }: Props) {
  const { cityId: legacyGuSlug } = await params;
  const found = findCityIdForDistrictSlug(legacyGuSlug);
  if (!found) notFound();
  permanentRedirect(demandRegionSeoPath(found.cityId, legacyGuSlug));
}
