import Link from "next/link";
import { getContaminantById, getMaterialById, getProductById, listRecipes } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "세정 레시피 | 클린아이덱스",
  description: "재질·오염·제품별 전문 세정 레시피.",
  path: "/cleaning",
});

export default function CleaningRecipesHubPage() {
  const recipes = listRecipes();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">세정 레시피</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          재질·오염·제품 조합별 희석과 작업 방법을 확인하세요.
        </p>
      </header>

      <ul className="space-y-4">
        {recipes.map((r) => {
          const product = getProductById(r.productId);
          const material = getMaterialById(r.materialId);
          const contaminant = getContaminantById(r.contaminantId);
          return (
            <li key={r.slug}>
              <Link
                href={`/cleaning/${r.slug}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
              >
                <span className="text-xs font-bold text-violet-700">{r.field}</span>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {material?.name} · {contaminant?.name}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{r.summary}</p>
                <p className="mt-3 text-sm font-bold text-slate-800">
                  {product?.name} · {r.dilution}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
