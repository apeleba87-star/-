import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryHubView from "@/components/knowledge-hub/CategoryHubView";
import { getCategory } from "@/lib/knowledge-hub/catalog";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = getCategory(slug);
  if (!cat) return { title: "카테고리" };
  return buildPageMetadata({
    title: `${cat.name} 가이드 | 클린아이덱스`,
    description: cat.description,
    path: cat.hubPath,
  });
}

export default async function ServiceCategoryHubPage({ params }: Props) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category || category.slug === "pollution") notFound();
  return <CategoryHubView category={category} />;
}
