import type { Metadata } from "next";
import CategoryHubView from "@/components/knowledge-hub/CategoryHubView";
import { getCategory } from "@/lib/knowledge-hub/catalog";
import { buildPageMetadata } from "@/lib/seo";
export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "오염·재질별 청소 방법 | 클린아이덱스",
  description: "곰팡이·기름때·물때 등 오염 유형과 재질별 청소·제거 방법 가이드.",
  path: "/guides",
});

export default function GuidesHubPage() {
  const category = getCategory("pollution");
  if (!category) return null;
  return <CategoryHubView category={category} />;
}
