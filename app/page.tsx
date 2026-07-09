import KnowledgeHubHome from "@/components/knowledge-hub/KnowledgeHubHome";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "클린아이덱스 — 오염·재질별 청소 방법 가이드",
  description:
    "사무실·상가·계단 정기청소와 입주청소 방법, 필요 약품·장비를 단계별로 안내합니다. 청소 견적 문의까지 한곳에서.",
  path: "/",
});

export default function HomePage() {
  return <KnowledgeHubHome />;
}
