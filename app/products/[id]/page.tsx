import { notFound } from "next/navigation";
import ProductDetailView, {
  type ProductExploreLink,
} from "@/components/knowledge-hub/ProductDetailView";
import { listPublishedEduBlogPosts } from "@/lib/edu-blog/queries";
import {
  getCleaningKnowledgeDb,
  getContaminantById,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";
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
  searchParams: Promise<{ from?: string }>;
};

/** 너무 넓어서 제품끼리 엉켜 붙는 오염 ID — 단독 매칭만으로는 추천하지 않음 */
const WEAK_CONTAMINANT_IDS = new Set(["stain-discoloration", "construction-dust"]);

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

function toRelatedProduct(p: {
  id: string;
  name: string;
  brand: string;
  phApprox?: string | null;
  contaminantsRaw?: string[];
  summary?: string;
}): ProductExploreLink {
  const useHint =
    (p.contaminantsRaw ?? []).filter(Boolean).slice(0, 2).join(" · ") ||
    p.summary?.split(/(?<=[.。！？!?])\s+/)[0]?.slice(0, 48) ||
    undefined;
  return {
    href: `/products/${p.id}`,
    title: p.name.replace(/\s*[((（][^)）]*[)）]\s*/g, "").trim() || p.name,
    subtitle: p.brand,
    brand: p.brand,
    phApprox: p.phApprox,
    useHint,
  };
}

function recipeContaminantIds(
  recipes: { productId: string; contaminantId: string }[],
  productId: string
): Set<string> {
  return new Set(
    recipes.filter((r) => r.productId === productId && r.contaminantId).map((r) => r.contaminantId)
  );
}

/** 레시피 오염 일치 > 강한 제품 오염 > 약한 오염 — 그라셋↔글라스퀸 같은 엉킨 루프 방지 */
function relatedScore(
  candidate: KnowledgeProduct,
  candidateRecipeIds: Set<string>,
  sourceRecipeIds: Set<string>,
  sourceProductIds: Set<string>
): number {
  const candProductIds = new Set(candidate.contaminantIds ?? []);
  let score = 0;

  for (const c of sourceRecipeIds) {
    if (candidateRecipeIds.has(c)) score += 10;
    else if (candProductIds.has(c)) score += 5;
  }

  for (const c of sourceProductIds) {
    if (sourceRecipeIds.has(c)) continue;
    if (!candProductIds.has(c) && !candidateRecipeIds.has(c)) continue;
    score += WEAK_CONTAMINANT_IDS.has(c) ? 0.25 : 2;
  }

  return score;
}

export default async function ProductDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { from } = await searchParams;
  const base = await getMergedProductById(id);
  if (!base) notFound();

  const salesMap = await getProductSalesMap();
  const product = applySalesToProduct(base, salesMap);
  const purchase = resolveProductPurchase(product);
  const db = getCleaningKnowledgeDb();
  const recipes = db.recipes.filter((r) => r.productId === id);

  const sourceRecipeIds = recipeContaminantIds(db.recipes, id);
  const sourceProductIds = new Set(product.contaminantIds ?? []);
  const allSourceIds = new Set([...sourceRecipeIds, ...sourceProductIds]);

  const allProducts = await listMergedProducts();
  const recipeIdsByProduct = new Map<string, Set<string>>();
  for (const r of db.recipes) {
    if (!r.productId || !r.contaminantId) continue;
    const set = recipeIdsByProduct.get(r.productId) ?? new Set<string>();
    set.add(r.contaminantId);
    recipeIdsByProduct.set(r.productId, set);
  }

  const scored = allProducts
    .filter((p) => p.id !== id && p.status !== "draft")
    .filter((p) => from == null || from === "" || p.id !== from)
    .map((p) => {
      const candRecipeIds = recipeIdsByProduct.get(p.id) ?? new Set<string>();
      const score = relatedScore(p, candRecipeIds, sourceRecipeIds, sourceProductIds);
      return { p, score };
    })
    .filter(({ p, score }) => {
      if (score < 2) return false;
      // 약한 오염만 겹치면 제외
      const candIds = new Set([...(p.contaminantIds ?? []), ...(recipeIdsByProduct.get(p.id) ?? [])]);
      const shared = [...allSourceIds].filter((c) => candIds.has(c));
      if (shared.length === 0) return false;
      if (shared.every((c) => WEAK_CONTAMINANT_IDS.has(c))) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name, "ko"));

  const relatedProducts: ProductExploreLink[] = scored.slice(0, 6).map(({ p }) => toRelatedProduct(p));

  const relatedPollutions: ProductExploreLink[] = [...allSourceIds]
    .filter((cid) => !WEAK_CONTAMINANT_IDS.has(cid) || sourceRecipeIds.has(cid))
    .map((cid) => getContaminantById(cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .slice(0, 4)
    .map((c) => ({
      href: `/pollution/${c.id}`,
      title: c.name,
      subtitle: "오염 가이드",
      category: "오염 가이드",
      icon: "microscope",
      desc: c.notes?.slice(0, 60) || `${c.name} 원인과 제거 방법을 확인하세요`,
      readTime: "3분 읽기",
    }));

  let relatedBlogs: ProductExploreLink[] = [];
  try {
    const blogs = await listPublishedEduBlogPosts();
    relatedBlogs = blogs
      .filter((b) => b.product_ids.includes(id))
      .slice(0, 4)
      .map((b) => ({
        href: `/blog/${b.slug}`,
        title: b.title,
        subtitle: "청소지식",
        category: "청소지식",
        icon: "book",
        desc: b.excerpt?.slice(0, 70) || "관련 청소 지식을 이어 읽으세요",
        readTime: "4분 읽기",
      }));
  } catch {
    relatedBlogs = [];
  }

  return (
    <div className="px-0 py-0 sm:py-0">
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
