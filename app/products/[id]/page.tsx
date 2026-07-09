import { notFound } from "next/navigation";
import KnowledgeDbPageView from "@/components/knowledge-hub/KnowledgeDbPageView";
import { getProductById, listProducts } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { generateProductPageBody } from "@/lib/knowledge-hub/generate-from-db";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return listProducts().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: "제품" };
  return buildPageMetadata({
    title: `${product.name} 사용법 | 클린아이덱스`,
    description: `${product.name} 희석·용도·주의사항.`,
    path: `/products/${id}`,
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = getProductById(id);
  const body = generateProductPageBody(id);
  if (!product || !body) notFound();

  return (
    <div className="px-4 py-10">
      <KnowledgeDbPageView
        h1={product.name}
        badge={`${product.brand} · 세정 제품`}
        intro={body.intro}
        summary={body.summary}
        body={body}
        breadcrumb={[{ href: "/products", label: "세정 제품" }]}
      />
    </div>
  );
}
