import KnowledgeHubHome from "@/components/knowledge-hub/KnowledgeHubHome";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "클린아이덱스 — 오염·재질·세제·장소로 찾는 청소법",
  description:
    "오염·재질·세제·장소로 청소 방법을 검색합니다. 레시피·사례·견적 문의까지.",
  path: "/",
});

export default function HomePage() {
  return <KnowledgeHubHome />;
}
