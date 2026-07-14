import { notFound } from "next/navigation";
import SolutionDetailView from "@/components/knowledge-hub/SolutionDetailView";
import {
  assembleSolution,
  listSolutionPages,
} from "@/lib/knowledge-hub/solutions/get-solutions";
import { buildSolutionJsonLd } from "@/lib/knowledge-hub/solutions/solution-jsonld";
import { buildPageMetadata, getBaseUrl } from "@/lib/seo";

export const revalidate = 86400;

type Props = {
  params: Promise<{
    place: string;
    space: string;
    part: string;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const pages = listSolutionPages();
  return pages.map((p) => ({
    place: p.placeId,
    space: p.spaceId,
    part: p.partId,
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { place, space, part, slug } = await params;
  const data = await assembleSolution(place, space, part, slug);
  if (!data) return { title: "가이드" };
  return buildPageMetadata({
    title: `${data.page.title} | 클린아이덱스`,
    description:
      data.content.summary ||
      data.page.description ||
      `${data.page.title} — ${data.contaminantName} 제거 방법과 제품 안내.`,
    path: data.path,
  });
}

export default async function SolutionDetailPage({ params }: Props) {
  const { place, space, part, slug } = await params;
  const data = await assembleSolution(place, space, part, slug);
  if (!data) notFound();

  const jsonLd = buildSolutionJsonLd(data, getBaseUrl());

  return (
    <main className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="page-shell py-8 sm:py-10">
        <SolutionDetailView data={data} />
      </div>
    </main>
  );
}
