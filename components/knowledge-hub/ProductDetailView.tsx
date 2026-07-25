import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import ProductPhBadge from "@/components/knowledge-hub/ProductPhBadge";
import ProductPurchaseBar from "@/components/knowledge-hub/ProductPurchaseBar";
import type {
  KnowledgeProduct,
  KnowledgeRecipe,
} from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { parseProductPh } from "@/lib/knowledge-hub/ph-scale";
import type { ProductPurchaseLink } from "@/lib/knowledge-hub/product-sales";

export type ProductExploreLink = {
  href: string;
  title: string;
  subtitle?: string;
};

type Props = {
  product: KnowledgeProduct;
  recipes: KnowledgeRecipe[];
  purchase: ProductPurchaseLink | null;
  relatedProducts?: ProductExploreLink[];
  relatedPollutions?: ProductExploreLink[];
  relatedBlogs?: ProductExploreLink[];
};

function shortDilutionLabel(dilution: string): string | null {
  const t = dilution.trim();
  if (!t) return null;
  if (t.length <= 16) {
    return t.replace(/^약\s*/, "").replace(/\s*권장$/, "").trim();
  }
  const m = t.match(
    /(원액(?:\s*[~～-]\s*\d+\s*:\s*\d+)?|노즐\s*\d+\s*:\s*\d+(?:\s*[~～-]\s*\d+\s*:\s*\d+)?|\d+\s*:\s*\d+(?:\s*[~～-]\s*\d+\s*:\s*\d+)?)/
  );
  return m ? m[1].replace(/\s+/g, "") : null;
}

/** 제품 상세 사용 사례 행 제목 — 제품명 제거, 짧은 희석비만 괄호로 */
function recipeCaseTitle(recipe: KnowledgeRecipe, product: KnowledgeProduct): string {
  let title = (recipe.seoTitle || recipe.field || recipe.summary || "").trim();

  const nameParts = new Set<string>();
  for (const raw of [product.name, ...(product.aliases ?? [])]) {
    const n = raw.trim();
    if (!n) continue;
    nameParts.add(n);
    const paren = n.match(/^([^(（]+)[(（]([^)）]+)[)）]/);
    if (paren) {
      nameParts.add(paren[1]!.trim());
      nameParts.add(paren[2]!.trim());
    }
  }
  const names = [...nameParts].filter((n) => n.length >= 2).sort((a, b) => b.length - a.length);

  for (const name of names) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    title = title.replace(new RegExp(`^${esc}(을|를)?(\\s*이용한)?\\s*`, "i"), "");
  }

  title = title.replace(/\s{2,}/g, " ").trim();

  const existingRatio = title.match(/\(([^)]*(?:\d+\s*:\s*\d+|원액)[^)]*)\)\s*$/);
  if (existingRatio) {
    return title;
  }

  const dil = shortDilutionLabel(recipe.dilution);
  if (dil && !title.includes(dil)) {
    title = `${title} (${dil})`;
  }
  return title;
}

function cleanPhrases(raw: string[]): string[] {
  return raw.filter((s) => {
    const t = s.trim();
    if (!t) return false;
    if (/^\(※|^※/.test(t)) return false;
    if (t.length > 24) return false;
    if (/마감$|최소화|우수$|권장$/.test(t) && !/때|오염|자국|잔유|석회|요석|기름|녹|먼지|비누/.test(t)) {
      return false;
    }
    return true;
  });
}

function cleanForbidden(raw: string[]): string[] {
  return raw.filter((s) => {
    const t = s.trim();
    if (!t) return false;
    if (/특히 주의할 재질|^주의/.test(t)) return false;
    if (t.length > 48) return false;
    return true;
  });
}

function shortLabel(s: string, max = 12): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function splitSummary(summary: string): { preview: string; rest: string | null } {
  const parts = summary.split(/(?<=[.。！？!?])\s+/).filter(Boolean);
  if (parts.length <= 2) return { preview: summary, rest: null };
  return { preview: parts.slice(0, 2).join(" "), rest: parts.slice(2).join(" ") };
}

function ChipRow({
  items,
  tone = "use",
}: {
  items: string[];
  tone?: "use" | "material" | "forbid";
}) {
  const chip =
    tone === "use"
      ? "border-emerald-100 bg-emerald-50 text-slate-900"
      : tone === "forbid"
        ? "border-rose-100 bg-white text-rose-950"
        : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <ul className="mt-2.5 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={`rounded-full border px-3 py-1.5 text-sm font-bold leading-snug break-keep ${chip}`}
        >
          {tone === "forbid" ? `⌀ ${item.trim()}` : item.trim()}
        </li>
      ))}
    </ul>
  );
}

function ExpandMoreSummary({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "forbid" | "warn" | "emerald";
}) {
  const toneClass =
    tone === "forbid"
      ? "border-rose-200 bg-white text-rose-900"
      : tone === "warn"
        ? "border-amber-200 bg-white text-amber-950"
        : tone === "emerald"
          ? "border-emerald-200 bg-white text-emerald-900"
          : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <summary
      className={`mt-2 flex min-h-[44px] cursor-pointer list-none items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition hover:bg-white [&::-webkit-details-marker]:hidden ${toneClass}`}
    >
      {label}
      <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
    </summary>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <div className="px-4 py-3.5 sm:px-5">{children}</div>
    </section>
  );
}

function ExploreGroup({
  title,
  links,
}: {
  title: string;
  links: ProductExploreLink[];
}) {
  if (!links.length) return null;
  return (
    <div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-[48px] items-center gap-3 px-3.5 py-3 transition hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-950 break-keep">{link.title}</span>
                {link.subtitle ? (
                  <span className="mt-0.5 block text-xs text-slate-500">{link.subtitle}</span>
                ) : null}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 기본 사용법 단계 — 첫 recipe steps 우선, 없으면 희석·대기·summary로 조합 */
function buildHowToSteps(product: KnowledgeProduct, recipes: KnowledgeRecipe[]): string[] {
  const primary = recipes[0];
  if (primary?.steps?.length) {
    return primary.steps.filter(Boolean).slice(0, 3);
  }

  const steps: string[] = [];
  if (product.standardDilution) {
    steps.push(
      product.standardDilution.includes("원액")
        ? `${product.standardDilution}으로 표면에 적용한다.`
        : `${product.standardDilution}로 희석해 준비한다.`
    );
  }
  if (product.dwellTime) {
    steps.push(`대기 ${product.dwellTime} 후 닦아낸다.`);
  }
  if (product.summary) {
    const first = product.summary.split(/(?<=[.。！？!?])\s+/)[0]?.trim();
    if (first && steps.length < 3) steps.push(first);
  }
  return steps.slice(0, 3);
}

/**
 * 제품 상세 — 모바일 우선: 사용법 → 상황별 → 주의 → 금지 → 스펙 → 이어서 보기
 */
export default function ProductDetailView({
  product,
  recipes,
  purchase,
  relatedProducts = [],
  relatedPollutions = [],
  relatedBlogs = [],
}: Props) {
  const contaminants = cleanPhrases(product.contaminantsRaw ?? []);
  const materials = cleanPhrases(product.materialsRaw ?? []);
  const usePreview = contaminants.slice(0, 6);
  const useMore = contaminants.slice(6);
  const matPreview = materials.slice(0, 6);
  const matMore = materials.slice(6);
  const forbidden = cleanForbidden(product.forbiddenRaw ?? []);
  const forbidPreview = forbidden.slice(0, 6);
  const forbidMore = forbidden.slice(6);
  const warnings = product.warnings.filter(Boolean);
  const summaryParts = product.summary ? splitSummary(product.summary) : null;
  const strengthBadges = [...contaminants.slice(0, 2), ...product.mainUse.slice(0, 2)]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);
  const phInfo = parseProductPh(product.phApprox);
  const howToSteps = buildHowToSteps(product, recipes);
  const primaryRecipe = recipes[0];
  const dwellLabel = primaryRecipe?.dwellTime || product.dwellTime;
  const heroSubtitle =
    primaryRecipe?.summary?.trim() ||
    [contaminants[0], contaminants[1]].filter(Boolean).join("·") ||
    product.mainUse.slice(0, 2).join("·") ||
    null;

  const hasExplore =
    relatedProducts.length > 0 ||
    relatedPollutions.length > 0 ||
    relatedBlogs.length > 0;

  return (
    <div className="min-h-screen">
      <article className="mx-auto max-w-lg space-y-4">
        <nav>
          <Link href="/products" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            ← 세정 제품
          </Link>
        </nav>

        {/* A · 히어로 */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="px-4 pt-4 pb-3.5 sm:px-5 sm:pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
                {product.brand}
              </p>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                사용법
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <h1 className="min-w-0 flex-1 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                {product.name}
              </h1>
              {phInfo ? <ProductPhBadge phApprox={product.phApprox} size="md" /> : null}
            </div>
            {heroSubtitle ? (
              <p className="mt-2 text-sm leading-6 text-slate-600 break-keep">{heroSubtitle}</p>
            ) : null}
          </div>
        </section>

        {/* B · 기본 사용법 (검색 답) */}
        <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/50">
          <div className="border-b border-emerald-100 px-4 py-3.5 sm:px-5">
            <h2 className="text-lg font-black text-slate-950">기본 사용법</h2>
            <p className="mt-0.5 text-sm text-slate-600">희석·대기·절차 요약</p>
          </div>

          <div
            className={`grid ${product.strongDilution ? "grid-cols-2 divide-x divide-emerald-100" : "grid-cols-1"}`}
          >
            <div className="px-4 py-3.5 sm:px-5">
              <p className="text-sm font-bold text-slate-500">희석비율</p>
              <p
                className={`mt-1 break-keep font-black leading-snug tracking-tight text-slate-950 ${
                  (product.standardDilution?.length ?? 0) > 14 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                }`}
              >
                {product.standardDilution ?? "원액/표기 확인"}
              </p>
            </div>
            {product.strongDilution ? (
              <div className="bg-white/60 px-4 py-3.5 sm:px-5">
                <p className="text-sm font-bold text-slate-500">집중 세정시</p>
                <p
                  className={`mt-1 break-keep font-black leading-snug tracking-tight text-slate-950 ${
                    product.strongDilution.length > 14 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                  }`}
                >
                  {product.strongDilution}
                </p>
              </div>
            ) : null}
          </div>

          {dwellLabel ? (
            <div className="border-t border-emerald-100 px-4 py-2.5 sm:px-5">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-emerald-100">
                대기 {dwellLabel}
              </span>
            </div>
          ) : null}

          {howToSteps.length ? (
            <ol className="space-y-2 border-t border-emerald-100 px-4 py-3.5 sm:px-5">
              {howToSteps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-6 text-slate-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 break-keep pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>

        {/* C · 상황별 다른 사용법 */}
        {recipes.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-lg font-black text-slate-950">상황별 사용법</h2>
            <p className="mt-1 text-sm text-slate-600">맞는 경우를 고르면 자세한 절차로 이동합니다</p>
            <ul className="mt-3 space-y-2.5">
              {recipes.map((r) => {
                const dil = shortDilutionLabel(r.dilution) ?? r.dilution;
                const blurb = r.steps[0]?.trim() || r.summary?.trim() || null;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/cleaning/${r.slug}`}
                      className="block rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3.5 transition hover:bg-emerald-50"
                    >
                      <div className="flex items-start gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-black leading-snug tracking-tight text-slate-950 break-keep">
                            {recipeCaseTitle(r, product)}
                          </span>
                          {dil ? (
                            <span className="mt-1.5 inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
                              {dil}
                            </span>
                          ) : null}
                          {blurb ? (
                            <span className="mt-1.5 block text-sm leading-5 text-slate-600 line-clamp-2 break-keep">
                              {blurb}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-xs font-bold text-emerald-700">
                          자세히
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* D · 주의 (짧게) */}
        {warnings.length ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-amber-950">주의 사항</h2>
            <ul className="mt-3 space-y-2">
              {warnings.slice(0, 3).map((c) => (
                <li
                  key={c}
                  className="rounded-xl border border-amber-100 bg-white px-3.5 py-2.5 text-sm leading-6 text-amber-950"
                >
                  {c}
                </li>
              ))}
            </ul>
            {warnings.length > 3 ? (
              <details className="mt-1">
                <ExpandMoreSummary label={`나머지 주의 ${warnings.length - 3}개 보기`} tone="warn" />
                <ul className="mt-2 space-y-2">
                  {warnings.slice(3).map((c) => (
                    <li key={c} className="rounded-xl bg-white px-3.5 py-2.5 text-sm leading-6 text-amber-950">
                      {c}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {/* E · 사용 금지 (접기) */}
        {forbidPreview.length ? (
          <details className="rounded-3xl border border-rose-200 bg-rose-50/60 px-4 py-3.5 sm:px-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-base font-bold text-rose-900">사용 금지</span>
                <span className="mt-0.5 block text-sm text-rose-800/80">
                  아래 재질·표면에는 쓰지 마세요 · {forbidden.length}개
                </span>
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-rose-700 opacity-70" aria-hidden />
            </summary>
            <ChipRow items={forbidPreview} tone="forbid" />
            {forbidMore.length ? (
              <details className="mt-1">
                <ExpandMoreSummary label={`나머지 금지 ${forbidMore.length}개 보기`} tone="forbid" />
                <ChipRow items={forbidMore} tone="forbid" />
              </details>
            ) : null}
          </details>
        ) : null}

        {/* F · 용도·재질·설명·기술 */}
        {usePreview.length ? (
          <SectionCard title="용도">
            <ChipRow items={usePreview} />
            {useMore.length ? (
              <details className="mt-1">
                <ExpandMoreSummary label={`나머지 용도 ${useMore.length}개 보기`} />
                <ChipRow items={useMore} />
              </details>
            ) : null}
          </SectionCard>
        ) : null}

        {matPreview.length ? (
          <SectionCard title="적용 재질">
            <ChipRow items={matPreview} tone="material" />
            {matMore.length ? (
              <details className="mt-1">
                <ExpandMoreSummary label={`나머지 재질 ${matMore.length}개 보기`} />
                <ChipRow items={matMore} tone="material" />
              </details>
            ) : null}
          </SectionCard>
        ) : null}

        {summaryParts ? (
          <details className="rounded-3xl border border-slate-200 bg-white px-4 py-3.5 sm:px-5" open>
            <summary className="cursor-pointer list-none text-lg font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
              제품 설명
            </summary>
            <p className="mt-2.5 text-base leading-7 text-slate-700">{summaryParts.preview}</p>
            {summaryParts.rest ? (
              <details className="mt-1">
                <ExpandMoreSummary label="설명 더 보기" />
                <p className="mt-2 text-base leading-7 text-slate-700">{summaryParts.rest}</p>
              </details>
            ) : null}
            {strengthBadges.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {strengthBadges.map((b) => (
                  <li
                    key={b}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900"
                  >
                    <span aria-hidden>✓</span>
                    {shortLabel(b, 14)}
                  </li>
                ))}
              </ul>
            ) : null}
          </details>
        ) : null}

        {phInfo || product.phApprox || product.mainUse.length ? (
          <details className="rounded-3xl border border-slate-200 bg-white px-4 py-3.5 sm:px-5">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">기술 정보</summary>
            <dl className="mt-2 divide-y divide-slate-100 text-sm">
              {phInfo ? (
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">pH</dt>
                  <dd>
                    <ProductPhBadge phApprox={product.phApprox} size="sm" />
                  </dd>
                </div>
              ) : product.phApprox ? (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">pH</dt>
                  <dd className="font-semibold text-slate-900">{product.phApprox}</dd>
                </div>
              ) : null}
              {product.mainUse.length ? (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-slate-500">장소</dt>
                  <dd className="text-right font-semibold text-slate-900">
                    {product.mainUse.slice(0, 4).join(", ")}
                    {product.mainUse.length > 4 ? ` 외 ${product.mainUse.length - 4}` : ""}
                  </dd>
                </div>
              ) : null}
            </dl>
          </details>
        ) : null}

        {/* G · 이어서 보기 */}
        {hasExplore ? (
          <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <h2 className="text-lg font-black text-slate-950">이어서 보기</h2>
            <p className="mt-1 text-sm text-slate-600">같은 오염·관련 가이드로 이어집니다</p>
            <div className="mt-3 space-y-4">
              <ExploreGroup title="같은 오염 · 다른 제품" links={relatedProducts} />
              <ExploreGroup title="관련 오염 가이드" links={relatedPollutions} />
              <ExploreGroup title="청소지식" links={relatedBlogs} />
              <Link
                href="/products"
                className="inline-flex min-h-[44px] items-center text-sm font-bold text-emerald-800 hover:text-emerald-950"
              >
                세정 제품 전체 보기 →
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <h2 className="text-lg font-black text-slate-950">이어서 보기</h2>
            <Link
              href="/products"
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-bold text-emerald-800 hover:text-emerald-950"
            >
              세정 제품 전체 보기 →
            </Link>
            <Link
              href="/blog"
              className="mt-1 flex min-h-[44px] items-center text-sm font-bold text-emerald-800 hover:text-emerald-950"
            >
              청소지식 보기 →
            </Link>
          </section>
        )}
      </article>

      <div className="h-16" aria-hidden />
      {purchase ? (
        <ProductPurchaseBar href={purchase.url} label={purchase.label} />
      ) : (
        <ProductPurchaseBar preparing />
      )}
    </div>
  );
}
