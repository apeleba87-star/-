import { buildGuideMetadata, renderGuidePage } from "@/lib/knowledge-hub/render-guide-page";
import { getCatalogTopic } from "@/lib/knowledge-hub/catalog";
import { notFound } from "next/navigation";

export const revalidate = 86400;

type Props = {
  params: Promise<{ category: string; topic: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category, topic } = await params;
  const meta = getCatalogTopic(category, topic);
  if (!meta) return { title: "가이드" };
  return buildGuideMetadata(meta.path);
}

export default async function ServiceTopicPage({ params, searchParams }: Props) {
  const { category, topic } = await params;
  const meta = getCatalogTopic(category, topic);
  if (!meta) notFound();
  const sp = await searchParams;
  return renderGuidePage(meta.path, sp);
}
