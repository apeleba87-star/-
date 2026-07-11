import { notFound } from "next/navigation";
import CleaningRecipeView from "@/components/knowledge-hub/CleaningRecipeView";
import { getRecipeWithEnrichedPaths, listRecipes } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { getProductSalesMap } from "@/lib/knowledge-hub/product-sales";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return listRecipes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const recipe = getRecipeWithEnrichedPaths(slug);
  if (!recipe) return { title: "레시피" };
  return buildPageMetadata({
    title: recipe.seoTitle,
    description: recipe.summary,
    path: `/cleaning/${slug}`,
  });
}

export default async function CleaningRecipePage({ params }: Props) {
  const { slug } = await params;
  const recipe = getRecipeWithEnrichedPaths(slug);
  if (!recipe) notFound();
  const salesMap = await getProductSalesMap();
  return (
    <div className="px-4 py-10">
      <CleaningRecipeView recipe={recipe} salesMap={salesMap} />
    </div>
  );
}
