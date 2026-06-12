import type { Metadata } from "next";
import DemandHubPageView from "@/components/demand/DemandHubPageView";
import { getCachedRadarShareCopy } from "@/lib/demand/radar-share-data";
import { buildRadarShareCopyFallback } from "@/lib/demand/radar-share-copy";
import { parseRadarShareParam } from "@/lib/demand/radar-share";
import { buildPageMetadata, radarHomeDescription, radarHomeTitle } from "@/lib/seo";

export const revalidate = 3600;

type PageProps = {
  searchParams: Promise<{ r?: string; ad_preview?: string; ad_preview_scope?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { r } = await searchParams;
  if (r) {
    const sel = parseRadarShareParam(r);
    if (sel) {
      const copy =
        (await getCachedRadarShareCopy(r)) ?? buildRadarShareCopyFallback(sel);
      if (copy) {
        return buildPageMetadata({
          title: copy.title,
          description: copy.description,
          path: `/?r=${encodeURIComponent(r)}`,
        });
      }
    }
  }
  return buildPageMetadata({
    title: radarHomeTitle,
    description: radarHomeDescription,
    path: "/",
  });
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <DemandHubPageView searchParams={params} />;
}
