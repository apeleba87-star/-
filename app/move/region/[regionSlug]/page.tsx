import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import DemandShell from "@/components/demand/DemandShell";
import MoveRegionSeoView from "@/components/demand/MoveRegionSeoView";
import { getRegionSeoPageData } from "@/lib/demand/region-seo-data";
import { moveRegionPath, resolveMoveRegionAlias } from "@/lib/demand/move-region-path";
import { buildPageMetadata, getBaseUrl } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  params: Promise<{ regionSlug: string }>;
};

function titleFor(regionLabel: string): string {
  return `${regionLabel} 이사 후보 분석 — 실거래가·입주 수요·입주청소 체크`;
}

function descriptionFor(regionLabel: string): string {
  return `${regionLabel} 최근 RTMS 실거래와 입주청소 검색 신호를 바탕으로 이사 후보 지역으로 볼 만한지 정리합니다. 전세·매매 흐름, 주변 지역 비교, 입주 전 체크리스트까지 확인하세요.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { regionSlug } = await params;
  const alias = resolveMoveRegionAlias(regionSlug);
  if (!alias) {
    return { title: "지역 이사 후보 분석" };
  }

  const data = await getRegionSeoPageData(alias.cityId, alias.guSlug);
  const regionLabel = data?.pathLabel ?? `${alias.cityFullLabel} ${alias.gu}`;
  const metadata = buildPageMetadata({
    title: titleFor(regionLabel),
    description: descriptionFor(regionLabel),
    path: moveRegionPath(alias.regionSlug),
  });

  if (data && !data.indexable) {
    return {
      ...metadata,
      robots: { index: false, follow: true },
    };
  }
  return metadata;
}

export default async function MoveRegionPage({ params }: Props) {
  const { regionSlug } = await params;
  const alias = resolveMoveRegionAlias(regionSlug);
  if (!alias) notFound();

  const canonicalPath = moveRegionPath(alias.regionSlug);
  if (decodeURIComponent(regionSlug) !== alias.regionSlug) {
    permanentRedirect(canonicalPath);
  }

  const data = await getRegionSeoPageData(alias.cityId, alias.guSlug);
  if (!data) notFound();

  const baseUrl = getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: titleFor(data.pathLabel),
    description: descriptionFor(data.pathLabel),
    url: `${baseUrl}${canonicalPath}`,
    dateModified: data.lastModified ?? undefined,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "클린아이덱스", item: `${baseUrl}/` },
        { "@type": "ListItem", position: 2, name: "지역 이사 후보", item: `${baseUrl}${canonicalPath}` },
        { "@type": "ListItem", position: 3, name: data.pathLabel, item: `${baseUrl}${canonicalPath}` },
      ],
    },
  };

  return (
    <DemandShell title={data.pathLabel} subtitle="이사 후보 분석" variant="minimal" searchVariant={false}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MoveRegionSeoView data={data} />
    </DemandShell>
  );
}

