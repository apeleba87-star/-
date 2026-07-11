import { notFound } from "next/navigation";
import KnowledgeDbPageView from "@/components/knowledge-hub/KnowledgeDbPageView";
import ProductSalesCta from "@/components/knowledge-hub/ProductSalesCta";
import ProInquiryCta from "@/components/knowledge-hub/ProInquiryCta";
import { getProductById, listProducts } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { generateProductPageBody } from "@/lib/knowledge-hub/generate-from-db";
import { applySalesToProduct, getProductSalesMap } from "@/lib/knowledge-hub/product-sales";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

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
    description: product.summary ?? `${product.name} 희석·용도·주의사항.`,
    path: `/products/${id}`,
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const base = getProductById(id);
  const body = generateProductPageBody(id);
  if (!base || !body) notFound();

  const salesMap = await getProductSalesMap();
  const product = applySalesToProduct(base, salesMap);

  return (
    <div className="px-4 py-10">
      <KnowledgeDbPageView
        h1={product.name}
        badge={`${product.brand} · 세정 제품`}
        intro={body.intro}
        summary={body.summary}
        body={body}
        breadcrumb={[{ href: "/products", label: "세정 제품" }]}
        footer={
          <div className="mt-10 space-y-6">
            <div className="rounded-3xl border border-teal-200 bg-teal-50/50 p-5">
              <h2 className="text-lg font-black text-slate-900">구매</h2>
              <div className="mt-3">
                <ProductSalesCta product={product} />
              </div>
            </div>
            <ProInquiryCta path={`/products/${id}`} productId={id} />
          </div>
        }
      />
    </div>
  );
}
