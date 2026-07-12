import { notFound } from "next/navigation";
import CaseDetailView from "@/components/knowledge-hub/CaseDetailView";
import {
  getCaseById,
  getProductById,
  listCases,
  listRecipes,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { caseHeadlineFull } from "@/lib/knowledge-hub/case-display";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return listCases().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const c = getCaseById(id);
  if (!c) return { title: "사례" };
  return buildPageMetadata({
    title: `${caseHeadlineFull(c)} | 클린아이덱스`,
    description: [c.productNames.join(", "), c.result].filter(Boolean).join(" · ").slice(0, 160),
    path: `/cases/${id}`,
  });
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const caseItem = getCaseById(id);
  if (!caseItem) notFound();

  const products = (caseItem.productIds ?? [])
    .map((pid) => getProductById(pid))
    .filter(Boolean)
    .map((p) => p!);

  const primaryId = caseItem.productIds?.[0];
  const usageRecipe = primaryId
    ? listRecipes().find((r) => r.productId === primaryId && !r.id.startsWith("recipe-from-"))
    : undefined;
  // 사례는 처방이 아니므로 제품 페이지를 우선, 레시피는 보조
  const usageHref = primaryId
    ? `/products/${primaryId}`
    : usageRecipe
      ? `/cleaning/${usageRecipe.slug}`
      : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-10">
        <CaseDetailView caseItem={caseItem} products={products} usageHref={usageHref} />
      </div>
    </main>
  );
}
