import { buildGuideMetadata, renderGuidePage } from "@/lib/knowledge-hub/render-guide-page";
import { getCatalogTopicByPath } from "@/lib/knowledge-hub/catalog";
import { notFound } from "next/navigation";

export const revalidate = 86400;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const path = `/guides/${slug}`;
  const meta = getCatalogTopicByPath(path);
  if (!meta) return { title: "가이드" };
  return buildGuideMetadata(path);
}

export default async function GuideTopicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const path = `/guides/${slug}`;
  if (!getCatalogTopicByPath(path)) notFound();
  const sp = await searchParams;
  return renderGuidePage(path, sp);
}
