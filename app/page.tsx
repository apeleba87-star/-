import type { Metadata } from "next";
import DemandHubPageView from "@/components/demand/DemandHubPageView";
import { formatRadarShareRegionLabel, parseRadarShareParam } from "@/lib/demand/radar-share";
import { getDemandCity, getDemandDistrictRef } from "@/lib/demand/regions";
import {
  buildPageMetadata,
  radarHomeDescription,
  radarHomeTitle,
  radarRegionDescription,
  radarRegionTitle,
} from "@/lib/seo";

export const revalidate = 3600;

type PageProps = {
  searchParams: Promise<{ r?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { r } = await searchParams;
  if (r) {
    const sel = parseRadarShareParam(r);
    const label = sel ? formatRadarShareRegionLabel(sel) : null;
    if (sel && label) {
      let description = radarRegionDescription(label, undefined);
      if (sel.scope === "district") {
        const city = getDemandCity(sel.cityId);
        const district = getDemandDistrictRef(sel.cityId, sel.guSlug);
        if (city && district) {
          description = radarRegionDescription(district.gu, city.fullLabel);
        }
      }
      return buildPageMetadata({
        title: radarRegionTitle(label),
        description,
        path: `/?r=${encodeURIComponent(r)}`,
      });
    }
  }
  return buildPageMetadata({
    title: radarHomeTitle,
    description: radarHomeDescription,
    path: "/",
  });
}

export default function HomePage() {
  return <DemandHubPageView />;
}
