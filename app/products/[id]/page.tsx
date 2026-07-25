import { notFound } from "next/navigation";
import ProductDetailView, {
  type ProductExploreLink,
} from "@/components/knowledge-hub/ProductDetailView";
import { listPublishedEduBlogPosts } from "@/lib/edu-blog/queries";
import {
  getCleaningKnowledgeDb,
  getContaminantById,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
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

function collectContaminantIds(
  productIds: string[] | undefined,
  recipeContaminantIds: string[]
): string[] {
  const set = new Set<string>();
  for (const id of productIds ?? []) {
    if (id) set.add(id);
  }
  for (const id of recipeContaminantIds) {
    if (id) set.add(id);
  }
  return [...set];
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const base = await getMergedProductById(id);
  if (!base) notFound();

  const salesMap = await getProductSalesMap();
  const product = applySalesToProduct(base, salesMap);
  const purchase = resolveProductPurchase(product);
  const db = getCleaningKnowledgeDb();
  const recipes = db.recipes.filter((r) => r.productId === id);

  const contaminantIds = collectContaminantIds(
    product.contaminantIds,
    recipes.map((r) => r.contaminantId)
  );

  const allProducts = await listMergedProducts();
  const relatedByContaminant = allProducts
    .filter((p) => p.id !== id && p.status !== "draft")
    .filter((p) => (p.contaminantIds ?? []).some((c) => contaminantIds.includes(c)))
    .slice(0, 6);

  // contaminantIds가 비어 있으면 같은 오염 recipe를 쓰는 제품으로 보완
  let relatedProducts: ProductExploreLink[] = relatedByContaminant.map((p) => ({
    href: `/products/${p.id}`,
    title: p.name,
    subtitle: p.brand,
  }));

  if (relatedProducts.length < 3 && contaminantIds.length) {
    const seen = new Set(relatedProducts.map((l) => l.href));
    const fromRecipes = db.recipes
      .filter((r) => r.productId !== id && contaminantIds.includes(r.contaminantId))
      .map((r) => r.productId);
    for (const pid of fromRecipes) {
      if (relatedProducts.length >= 4) break;
      const href = `/products/${pid}`;
      if (seen.has(href)) continue;
      const p = allProducts.find((x) => x.id === pid && x.status !== "draft");
      if (!p) continue;
      seen.add(href);
      relatedProducts.push({ href, title: p.name, subtitle: p.brand });
    }
  }

  relatedProducts = relatedProducts.slice(0, 4);

  const relatedPollutions: ProductExploreLink[] = contaminantIds
    .map((cid) => getContaminantById(cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .slice(0, 4)
    .map((c) => ({
      href: `/pollution/${c.id}`,
      title: c.name,
      subtitle: "오염 가이드",
    }));

  let relatedBlogs: ProductExploreLink[] = [];
  try {
    const blogs = await listPublishedEduBlogPosts();
    relatedBlogs = blogs
      .filter((b) => b.product_ids.includes(id))
      .slice(0, 3)
      .map((b) => ({
        href: `/blog/${b.slug}`,
        title: b.title,
        subtitle: "청소지식",
      }));
  } catch {
    relatedBlogs = [];
  }

  return (
    <div className="px-4 py-6 sm:py-8">
      <ProductDetailView
        product={product}
        recipes={recipes}
        purchase={purchase}
        relatedProducts={relatedProducts}
        relatedPollutions={relatedPollutions}
        relatedBlogs={relatedBlogs}
      />
    </div>
  );
}
