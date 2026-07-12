import Link from "next/link";
import {
  getContaminantById,
  getMaterialById,
  getProductById,
  getRecipeBySlug,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";

type Props = {
  title: string;
  recipeSlugs: string[];
  subtitle?: string;
  id?: string;
};

function shortName(name: string): string {
  return name.split("(")[0]!.trim();
}

export default function RecipeSummaryList({ title, recipeSlugs, subtitle, id = "recipes" }: Props) {
  if (!recipeSlugs.length) return null;

  const items = recipeSlugs
    .map((slug) => {
      const recipe = getRecipeBySlug(slug);
      if (!recipe) return null;
      const product = getProductById(recipe.productId);
      const material = getMaterialById(recipe.materialId);
      const contaminant = getContaminantById(recipe.contaminantId);
      return { recipe, product, material, contaminant };
    })
    .filter(Boolean);

  if (!items.length) return null;

  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const { recipe, product, material, contaminant } = item!;
          return (
            <li key={recipe.slug}>
              <Link
                href={`/cleaning/${recipe.slug}`}
                className="block rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 transition hover:border-teal-300 hover:bg-white"
              >
                <p className="break-keep text-xl font-black leading-snug text-slate-950 sm:text-2xl">
                  {product?.name ?? recipe.productId}
                </p>
                <p className="mt-2 text-lg font-black text-teal-800 sm:text-xl">희석 {recipe.dilution}</p>
                <p className="mt-2 text-base text-slate-600">
                  {material ? shortName(material.name) : null}
                  {material && contaminant ? " · " : null}
                  {contaminant ? shortName(contaminant.name) : null}
                  {recipe.field ? ` · ${recipe.field}` : null}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
