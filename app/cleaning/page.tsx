import RecipesCatalog from "@/components/knowledge-hub/RecipesCatalog";
import {
  getContaminantById,
  getMaterialById,
  getProductById,
  listRecipes,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "세정 레시피 | 클린아이덱스",
  description: "재질·오염·제품별 전문 세정 레시피.",
  path: "/cleaning",
});

export default function CleaningRecipesHubPage() {
  const recipes = listRecipes().map((r) => {
    const product = getProductById(r.productId);
    const material = getMaterialById(r.materialId);
    const contaminant = getContaminantById(r.contaminantId);
    return {
      slug: r.slug,
      field: r.field,
      dilution: r.dilution,
      productId: r.productId,
      productName: product?.name ?? r.productId,
      materialName: material?.name ?? r.materialId,
      contaminantName: contaminant?.name ?? r.contaminantId,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <RecipesCatalog recipes={recipes} />
        </div>
      </div>
    </main>
  );
}
