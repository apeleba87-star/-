import { notFound } from "next/navigation";
import ProductDetailView from "@/components/knowledge-hub/ProductDetailView";
import { getCleaningKnowledgeDb } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import {
  getMergedProductById,
  listMergedProducts,
} from "@/lib/knowledge-hub/product-catalog";
import {
  applySalesToProduct,
  getProductSalesMap,
  resolveProductPurchase,
} from "@/lib/knowledge-hub/product-sales";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const products = await listMergedProducts();
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await getMergedProductById(id);
  if (!product) return { title: "제품" };
  const meta = buildPageMetadata({
    title: `${product.name} 사용법 | 클린아이덱스`,
    description: product.summary ?? `${product.name} 희석·용도·주의사항.`,
    path: `/products/${id}`,
  });
  if (product.status === "draft") {
    return { ...meta, robots: { index: false, follow: true } };
  }
  return meta;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const base = await getMergedProductById(id);
  if (!base) notFound();

  const salesMap = await getProductSalesMap();
  const product = applySalesToProduct(base, salesMap);
  const purchase = resolveProductPurchase(product);
  const recipes = getCleaningKnowledgeDb().recipes.filter((r) => r.productId === id);

  return (
    <div className="px-4 py-6 sm:py-8">
      <ProductDetailView product={product} recipes={recipes} purchase={purchase} />
    </div>
  );
}
