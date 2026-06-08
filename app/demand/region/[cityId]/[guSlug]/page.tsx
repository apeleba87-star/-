import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DemandShell from "@/components/demand/DemandShell";
import DemandRegionSeoView from "@/components/demand/DemandRegionSeoView";
import { DEMAND_HEAT_BAND_LABELS } from "@/lib/demand/copy";
import { getRegionSeoPageData } from "@/lib/demand/region-seo-data";
import { demandRegionSeoPath, parseDemandRegionSeoParams } from "@/lib/demand/region-seo-path";
import {
  buildPageMetadata,
  getBaseUrl,
  radarRegionSeoDescription,
  radarRegionSeoTitle,
} from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ cityId: string; guSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cityId, guSlug } = await params;
  const parsed = parseDemandRegionSeoParams(cityId, guSlug);
  if (!parsed) return { title: "지역 입주 수요" };

  const data = await getRegionSeoPageData(cityId, guSlug);
  if (!data) {
    return buildPageMetadata({
      title: radarRegionSeoTitle(parsed.cityFullLabel + " " + parsed.gu, null),
      description: `${parsed.cityFullLabel} ${parsed.gu} 입주·입주청소 수요 데이터 준비 중입니다.`,
      path: demandRegionSeoPath(cityId, guSlug),
    });
  }

  const bandLabel = DEMAND_HEAT_BAND_LABELS[data.row.demandScore.band].label;
  const meta = buildPageMetadata({
    title: radarRegionSeoTitle(data.pathLabel, data.row.demandScore.basis.targetYyyymm),
    description: radarRegionSeoDescription({
      placeLabel: data.pathLabel,
      targetYyyymm: data.row.demandScore.basis.targetYyyymm,
      jeonseCount: data.row.jeonseCount,
      jeonseMom: data.row.jeonseMom,
      saleCount: data.row.saleCount,
      moveInIndexMom: data.row.moveInClean.indexMomPercent,
      score: data.row.demandScore.score,
      bandLabel,
    }),
    path: demandRegionSeoPath(cityId, guSlug),
  });

  if (!data.indexable) {
    return {
      ...meta,
      robots: { index: false, follow: true },
    };
  }
  return meta;
}

export default async function DemandRegionSeoPage({ params }: Props) {
  const { cityId, guSlug } = await params;
  const parsed = parseDemandRegionSeoParams(cityId, guSlug);
  if (!parsed) notFound();

  const data = await getRegionSeoPageData(cityId, guSlug);
  if (!data) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: radarRegionSeoTitle(data.pathLabel, data.row.demandScore.basis.targetYyyymm),
    description: data.insightLine,
    url: `${getBaseUrl()}${demandRegionSeoPath(cityId, guSlug)}`,
    dateModified: data.lastModified ?? undefined,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "입주레이더", item: getBaseUrl() },
        {
          "@type": "ListItem",
          position: 2,
          name: parsed.cityFullLabel,
          item: `${getBaseUrl()}/`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: parsed.gu,
          item: `${getBaseUrl()}${demandRegionSeoPath(cityId, guSlug)}`,
        },
      ],
    },
  };

  return (
    <DemandShell title={data.pathLabel} subtitle="입주청소·입주 수요" variant="minimal" searchVariant={false}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DemandRegionSeoView data={data} />
    </DemandShell>
  );
}
