import Link from "next/link";
import { AlertTriangle, Beaker, Clock, Droplets, Wrench } from "lucide-react";
import EntityRichText from "@/components/knowledge-hub/EntityRichText";
import type { KnowledgeRecipe } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import {
  getContaminantById,
  getMaterialById,
  getProductById,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { getCatalogTopicByPath } from "@/lib/knowledge-hub/catalog";

type Props = {
  recipe: KnowledgeRecipe;
};

function confidenceLabel(c: KnowledgeRecipe["confidence"]) {
  if (c === "high") return "검증됨";
  if (c === "medium") return "참고";
  return "현장 확인 필요";
}

export default function CleaningRecipeView({ recipe }: Props) {
  const product = getProductById(recipe.productId);
  const material = getMaterialById(recipe.materialId);
  const contaminant = getContaminantById(recipe.contaminantId);

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-6 text-sm font-medium text-slate-500">
        <Link href="/" className="hover:text-teal-700">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/cleaning" className="hover:text-teal-700">
          세정 레시피
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{recipe.field}</span>
      </nav>

      <header className="mb-8">
        <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
          세정 레시피 · {confidenceLabel(recipe.confidence)}
        </span>
        <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
          <Link href={`/materials/${recipe.materialId}`} className="hover:text-teal-800 hover:underline">
            {material?.name}
          </Link>
          {" — "}
          <Link href={`/pollution/${recipe.contaminantId}`} className="hover:text-rose-800 hover:underline">
            {contaminant?.name}
          </Link>
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{recipe.summary}</p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Beaker className="h-4 w-4" aria-hidden />
            제품
          </div>
          <p className="mt-2 text-lg font-black text-slate-900">
            {product ? (
              <Link href={`/products/${product.id}`} className="hover:text-violet-800 hover:underline">
                {product.brand} {product.name}
              </Link>
            ) : (
              recipe.productId
            )}
          </p>
          {product?.phApprox ? (
            <p className="mt-1 text-sm text-slate-600">pH {product.phApprox}</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Droplets className="h-4 w-4" aria-hidden />
            희석
          </div>
          <p className="mt-2 text-lg font-black text-slate-900">{recipe.dilution}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Clock className="h-4 w-4" aria-hidden />
            대기 시간
          </div>
          <p className="mt-2 text-lg font-black text-slate-900">{recipe.dwellTime}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Wrench className="h-4 w-4" aria-hidden />
            도구
          </div>
          <ul className="mt-2 space-y-1 text-sm font-medium text-slate-800">
            {recipe.tools.map((t) => (
              <li key={t}>· {t}</li>
            ))}
          </ul>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black text-slate-950">작업 순서</h2>
        <ol className="mt-4 space-y-4">
          {recipe.steps.map((step, i) => (
            <li key={step} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-lg font-black text-white">
                {i + 1}
              </span>
              <p className="text-base leading-relaxed text-slate-700">
                <EntityRichText text={step} />
              </p>
            </li>
          ))}
        </ol>
      </section>

      {recipe.warnings.length ? (
        <section className="mt-6 rounded-3xl border border-rose-200 bg-rose-50/70 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden />
            <h2 className="text-lg font-black text-rose-900">주의사항</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {recipe.warnings.map((w) => (
              <li key={w} className="text-sm font-medium text-rose-900">
                · {w}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recipe.guidePaths?.length ? (
        <section className="mt-10 rounded-3xl border border-teal-200 bg-teal-50/60 p-5 sm:p-6">
          <h2 className="text-lg font-black text-slate-900">연결된 가이드</h2>
          <p className="mt-1 text-sm text-slate-600">이 레시피가 참조되는 청소 가이드 페이지입니다.</p>
          <ul className="mt-3 space-y-2">
            {recipe.guidePaths.map((p) => {
              const topic = getCatalogTopicByPath(p);
              return (
                <li key={p}>
                  <Link href={p} className="text-base font-bold text-teal-800 hover:underline">
                    {topic?.h1 ?? p}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {recipe.sources?.length ? (
        <section className="mt-8 text-xs text-slate-500">
          <p className="font-bold text-slate-600">출처</p>
          <ul className="mt-2 space-y-1">
            {recipe.sources.map((s) => (
              <li key={s.title}>
                {s.title}
                {s.author ? ` — ${s.author}` : ""}
                {s.date ? ` (${s.date})` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
