import Link from "next/link";
import type { ReactNode } from "react";
import ProductPhBadge from "@/components/knowledge-hub/ProductPhBadge";
import ProductPurchaseBar from "@/components/knowledge-hub/ProductPurchaseBar";
import type { KnowledgeProduct, KnowledgeRecipe } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { parseProductPh } from "@/lib/knowledge-hub/ph-scale";
import type { ProductPurchaseLink } from "@/lib/knowledge-hub/product-sales";

type Props = {
  product: KnowledgeProduct;
  recipes: KnowledgeRecipe[];
  purchase: ProductPurchaseLink | null;
};

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

function TileGrid({ items, tone = "use" }: { items: string[]; tone?: "use" | "material" }) {
  const tile =
    tone === "use"
      ? "border-emerald-100 bg-emerald-50/80 text-slate-900"
      : "border-slate-100 bg-slate-50 text-slate-800";
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {items.map((item) => (
        <li
          key={item}
          className={`flex min-h-[5.25rem] items-center justify-center rounded-2xl border px-3 py-4 text-center text-base font-bold leading-snug break-keep ${tile}`}
        >
          {item.trim()}
        </li>
      ))}
    </ul>
  );
}

function ForbiddenTile({ label }: { label: string }) {
  return (
    <li className="flex min-h-[5rem] flex-col items-center justify-center gap-1 rounded-2xl border border-rose-100 bg-white px-3 py-4 text-center">
      <span className="text-lg font-bold text-rose-600" aria-hidden>
        ⌀
      </span>
      <span className="text-base font-semibold leading-snug text-rose-950 break-keep">
        {label.trim()}
      </span>
    </li>
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
    <section className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-sm">
      <div className="border-b-2 border-slate-200 px-5 py-4 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      <div className="px-5 py-4 sm:px-6">{children}</div>
    </section>
  );
}

/**
 * 시안 맥락 UI — 카드·큰 희석·용도/재질 타일·금지/주의 분리
 * 사진·별점·MSDS·용량 선택·임의 아이콘 일러스트 없음 (문서 필드만)
 */
export default function ProductDetailView({ product, recipes, purchase }: Props) {
  const contaminants = cleanPhrases(product.contaminantsRaw ?? []);
  const materials = cleanPhrases(product.materialsRaw ?? []);
  const useVisible = contaminants.slice(0, 6);
  const useMore = contaminants.slice(6);
  const matVisible = materials.slice(0, 6);
  const matMore = materials.slice(6);
  const forbidden = cleanForbidden(product.forbiddenRaw ?? []);
  const forbiddenVisible = forbidden.slice(0, 6);
  const forbiddenMore = forbidden.slice(6);
  const warnings = product.warnings.filter(Boolean);
  const summaryParts = product.summary ? splitSummary(product.summary) : null;
  const strengthBadges = [
    ...contaminants.slice(0, 2),
    ...product.mainUse.slice(0, 2),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
  const recipesVisible = recipes.slice(0, 4);
  const phInfo = parseProductPh(product.phApprox);

  return (
    <div className="-mx-4 min-h-screen bg-slate-100 px-4 py-6 sm:mx-0 sm:rounded-3xl sm:bg-transparent sm:px-0 sm:py-0">
      <article className="mx-auto max-w-lg space-y-4">
        <nav>
          <Link href="/products" className="text-base text-slate-500 hover:text-slate-800">
            ← 세정 제품
          </Link>
        </nav>

        {/* Hero — 이름 / 용도 / 문의 구역 분리 */}
        <section className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-sm">
          <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">{product.brand}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <h1 className="min-w-0 flex-1 text-[1.65rem] font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                {product.name}
              </h1>
              {phInfo ? <ProductPhBadge phApprox={product.phApprox} size="md" /> : null}
            </div>
          </div>

          {useVisible.length ? (
            <div className="border-t-2 border-slate-200 bg-emerald-50 px-5 py-4 sm:px-6">
              <p className="text-base font-bold text-emerald-900">주요 용도</p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {useVisible.slice(0, 4).map((u) => (
                  <li
                    key={u}
                    className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-base font-bold text-slate-900"
                  >
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* 희석 — 표준 / 집중 칸 분리 */}
        <section className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-sm">
          <div
            className={`grid ${product.strongDilution ? "grid-cols-2 divide-x-2 divide-slate-200" : "grid-cols-1"}`}
          >
            <div className="px-5 py-5 sm:px-6">
              <p className="text-sm font-bold text-slate-500">희석비율</p>
              <p className="mt-1.5 break-keep text-2xl font-black leading-snug tracking-tight text-slate-950 sm:text-3xl">
                {product.standardDilution ?? "원액/표기 확인"}
              </p>
              {product.standardDilution ? (
                <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
                  문서 기준
                </span>
              ) : null}
            </div>
            {product.strongDilution ? (
              <div className="bg-slate-100/80 px-5 py-5 sm:px-6">
                <p className="text-sm font-bold text-slate-500">집중 세정시</p>
                <p className="mt-1.5 break-keep text-2xl font-black leading-snug tracking-tight text-slate-950 sm:text-3xl">
                  {product.strongDilution}
                </p>
              </div>
            ) : null}
          </div>
          {product.dwellTime ? (
            <div className="border-t-2 border-slate-200 px-5 py-3 sm:px-6">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                대기 {product.dwellTime}
              </span>
            </div>
          ) : null}
        </section>

        {recipesVisible.length ? (
          <section className="rounded-3xl border-2 border-slate-300 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-900">현장 사례</h2>
            <ul className="mt-3 space-y-3">
              {recipesVisible.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/cleaning/${r.slug}`}
                    className="text-base font-semibold text-emerald-900 underline-offset-2 hover:underline"
                  >
                    {r.seoTitle || r.summary}
                  </Link>
                  <p className="mt-0.5 text-sm text-slate-500">희석 {r.dilution}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 용도 */}
        {useVisible.length ? (
          <SectionCard title="용도">
            <TileGrid items={useVisible} />
            {useMore.length ? (
              <details id="use-more" className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-500">
                  용도 {useMore.length}개 더
                </summary>
                <TileGrid items={useMore} />
              </details>
            ) : null}
          </SectionCard>
        ) : null}

        {/* 재질 */}
        {matVisible.length ? (
          <SectionCard title="적용 재질">
            <TileGrid items={matVisible} tone="material" />
            {matMore.length ? (
              <details id="mat-more" className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-500">
                  재질 {matMore.length}개 더
                </summary>
                <TileGrid items={matMore} tone="material" />
              </details>
            ) : null}
          </SectionCard>
        ) : null}

        {/* 사용 금지 = 이 재질/표면에는 쓰지 말 것 */}
        {forbiddenVisible.length ? (
          <section className="rounded-3xl border-2 border-rose-200 bg-rose-50/80 p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-rose-900">사용 금지</h2>
            <p className="mt-1 text-base text-rose-800/80">아래 재질·표면에는 쓰지 마세요</p>
            <ul className="mt-4 grid grid-cols-2 gap-2.5">
              {forbiddenVisible.map((c) => (
                <ForbiddenTile key={c} label={c} />
              ))}
            </ul>
            {forbiddenMore.length ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-rose-800">
                  금지 {forbiddenMore.length}개 더
                </summary>
                <ul className="mt-3 grid grid-cols-2 gap-2.5">
                  {forbiddenMore.map((c) => (
                    <ForbiddenTile key={c} label={c} />
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {/* 일반 주의 (취급·작업 안내) */}
        {warnings.length ? (
          <section className="rounded-3xl border-2 border-amber-200 bg-amber-50/70 p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-amber-950">주의 사항</h2>
            <ul className="mt-3 space-y-2">
              {warnings.slice(0, 4).map((c) => (
                <li
                  key={c}
                  className="rounded-xl border border-amber-100 bg-white px-4 py-3 text-base leading-7 text-amber-950"
                >
                  {c}
                </li>
              ))}
            </ul>
            {warnings.length > 4 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-amber-900">
                  주의 {warnings.length - 4}개 더
                </summary>
                <ul className="mt-2 space-y-2">
                  {warnings.slice(4).map((c) => (
                    <li key={c} className="rounded-xl bg-white px-4 py-3 text-base leading-7 text-amber-950">
                      {c}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {/* 설명 + 배지 */}
        {summaryParts ? (
          <section className="rounded-3xl border-2 border-slate-300 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-900">제품 설명</h2>
            <p className="mt-3 text-base leading-8 text-slate-700">{summaryParts.preview}</p>
            {summaryParts.rest ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-slate-500">설명 더 보기</summary>
                <p className="mt-2 text-base leading-8 text-slate-700">{summaryParts.rest}</p>
              </details>
            ) : null}
            {strengthBadges.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {strengthBadges.map((b) => (
                  <li
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900"
                  >
                    <span aria-hidden>✓</span>
                    {shortLabel(b, 14)}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* 기술 정보 — 규격(용량) 제외 */}
        {phInfo || product.phApprox || product.mainUse.length ? (
          <section className="rounded-3xl border-2 border-slate-300 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-900">기술 정보</h2>
            <dl className="mt-3 divide-y divide-slate-100 text-base">
              {phInfo ? (
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-slate-500">pH</dt>
                  <dd className="flex flex-wrap items-center justify-end gap-2">
                    <ProductPhBadge phApprox={product.phApprox} size="sm" />
                  </dd>
                </div>
              ) : product.phApprox ? (
                <div className="flex justify-between gap-4 py-3">
                  <dt className="shrink-0 text-slate-500">pH</dt>
                  <dd className="text-right font-semibold text-slate-900">{product.phApprox}</dd>
                </div>
              ) : null}
              {product.mainUse.length ? (
                <div className="flex justify-between gap-4 py-3">
                  <dt className="shrink-0 text-slate-500">장소</dt>
                  <dd className="text-right font-semibold text-slate-900">
                    {product.mainUse.slice(0, 4).join(", ")}
                    {product.mainUse.length > 4 ? ` 외 ${product.mainUse.length - 4}` : ""}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}
      </article>
      {/* 하단 고정 구매 버튼 여백 */}
      {purchase ? <div className="h-20" aria-hidden /> : null}
      {purchase ? <ProductPurchaseBar href={purchase.url} label={purchase.label} /> : null}
    </div>
  );
}
