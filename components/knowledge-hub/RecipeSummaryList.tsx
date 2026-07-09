import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  const base = name.split("(")[0].trim();
  return base.length > 14 ? `${base.slice(0, 14)}…` : base;
}

function RecipeCard({ slug }: { slug: string }) {
  const recipe = getRecipeBySlug(slug);
  if (!recipe) return null;

  const product = getProductById(recipe.productId);
  const material = getMaterialById(recipe.materialId);
  const contaminant = getContaminantById(recipe.contaminantId);

  return (
    <Link
      href={`/cleaning/${slug}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">
          {recipe.field}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-violet-600 opacity-0 transition group-hover:opacity-100">
          상세
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>

      <p className="mt-3 text-lg font-black leading-snug text-slate-900 group-hover:text-violet-900">
        {product?.name ?? recipe.productId}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {material ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {shortName(material.name)}
          </span>
        ) : null}
        {contaminant ? (
          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
            {shortName(contaminant.name)}
          </span>
        ) : null}
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{recipe.summary}</p>

      <p className="mt-3 inline-flex w-fit rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">
        희석 {recipe.dilution}
      </p>
    </Link>
  );
}

export default function RecipeSummaryList({ title, recipeSlugs, subtitle, id = "recipes" }: Props) {
  if (!recipeSlugs.length) return null;

  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6">
      <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {subtitle ?? "재질·오염에 맞는 제품 조합입니다. 번호는 순서가 아니라 선택지예요."}
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {recipeSlugs.map((slug) => (
          <li key={slug}>
            <RecipeCard slug={slug} />
          </li>
        ))}
      </ul>
    </section>
  );
}
