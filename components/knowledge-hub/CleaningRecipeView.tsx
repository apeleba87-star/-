import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import ProductSalesCta from "@/components/knowledge-hub/ProductSalesCta";
import {
  Clock,
  Droplets,
  LinkedGuides,
  MetricCard,
  PhMetricCard,
  ToolsStrip,
  WarningsPanel,
  WorkSteps,
} from "@/components/knowledge-hub/GrassetStyleBlocks";
import type { KnowledgeRecipe } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import {
  getContaminantById,
  getMaterialById,
  getProductById,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { getCatalogTopicByPath } from "@/lib/knowledge-hub/catalog";
import { parseProductPhPair } from "@/lib/knowledge-hub/ph-scale";
import { applySalesToProduct, type ProductSalesRow } from "@/lib/knowledge-hub/product-sales";

type Props = {
  recipe: KnowledgeRecipe;
  salesMap?: Record<string, ProductSalesRow>;
};

function confidenceLabel(c: KnowledgeRecipe["confidence"]) {
  if (c === "high") return "검증됨";
  if (c === "medium") return "참고";
  return "현장 확인 필요";
}

/** 히어로에서 희석 문구 제거 — 희석 비율 카드에만 표기 */
function summaryWithoutDilution(summary: string, dilution: string): string {
  let s = summary.trim();
  if (dilution.trim()) {
    const esc = dilution.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`[,.·]?\\s*(권장\\s*)?${esc}`, "gi"), "");
  }
  s = s.replace(/[,.·]?\s*권장\s*약?\s*\d+\s*:\s*\d+(?:\s*~\s*\d+\s*:\s*\d+)?/gi, "");
  s = s.replace(/[,.·]?\s*약\s*\d+\s*:\s*\d+(?:\s*~\s*\d+\s*:\s*\d+)?/gi, "");
  s = s.replace(/\(\s*8L에[^)]*\)/gi, "");
  s = s.replace(/\s{2,}/g, " ").replace(/\s*([.。])\s*[.。]+/g, "$1").trim();
  s = s.replace(/[.。]\s*$/, "").trim();
  if (s && !/[.。!?]$/.test(s)) s = `${s}.`;
  return s;
}

export default function CleaningRecipeView({ recipe, salesMap = {} }: Props) {
  const baseProduct = getProductById(recipe.productId);
  const product = baseProduct ? applySalesToProduct(baseProduct, salesMap) : undefined;
  const material = getMaterialById(recipe.materialId);
  const contaminant = getContaminantById(recipe.contaminantId);
  const phPair = parseProductPhPair(product?.phApprox);
  const inquiryHref = `/inquiry/regular?product=${encodeURIComponent(recipe.productId)}&recipe=${encodeURIComponent(recipe.slug)}&path=${encodeURIComponent(`/cleaning/${recipe.slug}`)}`;

  const linked = (recipe.guidePaths ?? []).slice(0, 4).map((p) => {
    const topic = getCatalogTopicByPath(p);
    return { href: p, label: topic?.h1 ?? p };
  });

  const dilutionLong = recipe.dilution.length > 14;

  return (
    <article className="mx-auto max-w-lg space-y-4">
      <nav className="text-sm font-medium text-slate-500">
        <Link href="/cleaning" className="hover:text-emerald-800">
          ← 세정 레시피
        </Link>
      </nav>

      <header className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
          세정 레시피 · {confidenceLabel(recipe.confidence)}
        </span>
        <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl break-keep">
          <Link href={`/materials/${recipe.materialId}`} className="hover:text-emerald-800 hover:underline">
            {material?.name}
          </Link>
          {" — "}
          <Link href={`/pollution/${recipe.contaminantId}`} className="hover:text-rose-800 hover:underline">
            {contaminant?.name}
          </Link>
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {summaryWithoutDilution(recipe.summary, recipe.dilution)}
        </p>
      </header>

      {product ? (
        <Link
          href={`/products/${product.id}`}
          className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3.5 transition hover:border-emerald-300 hover:bg-emerald-50"
        >
          <Droplets className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-emerald-800">제품</span>
            <span className="mt-0.5 block text-lg font-black leading-snug text-slate-950 break-keep">
              {product.name}
            </span>
          </span>
          <span className="shrink-0 text-xs font-bold text-emerald-700">상세</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          icon={Droplets}
          label="희석 비율"
          value={recipe.dilution}
          badge="권장"
          className={dilutionLong ? "col-span-2" : ""}
        />
        <MetricCard icon={Clock} label="대기 시간" value={recipe.dwellTime || "즉시"} />
        {phPair.concentrate ? (
          <PhMetricCard label="pH (원액)" info={phPair.concentrate} />
        ) : product?.phApprox ? (
          <MetricCard icon={Droplets} label="pH" value={product.phApprox} />
        ) : null}
        {phPair.diluted ? (
          <PhMetricCard label="pH (사용액)" info={phPair.diluted} badge="희석 후" />
        ) : null}
      </div>

      <ToolsStrip tools={recipe.tools} />

      <WorkSteps steps={recipe.steps} rich />

      <WarningsPanel items={recipe.warnings} />

      <div className="flex flex-wrap gap-2">
        <Link
          href={inquiryHref}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white sm:flex-none"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          제품 문의
        </Link>
        {product ? (
          <Link
            href={`/products/${product.id}`}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 sm:flex-none"
          >
            제품 상세
          </Link>
        ) : null}
      </div>

      <LinkedGuides title="장소별 가이드" items={linked} />

      {product ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-black text-slate-950">제품 구매</h2>
          <div className="mt-3">
            <ProductSalesCta product={product} />
          </div>
        </section>
      ) : null}
    </article>
  );
}
