import Link from "next/link";
import type { KnowledgeCaseEvidence, KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import {
  caseHeadlineFull,
  casePlaceLabel,
  caseResultFull,
  evidenceLevelLabel,
} from "@/lib/knowledge-hub/case-display";

type Props = {
  caseItem: KnowledgeCaseEvidence;
  products: KnowledgeProduct[];
  usageHref?: string | null;
};

function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-200 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default function CaseDetailView({ caseItem, products, usageHref }: Props) {
  const place = casePlaceLabel(caseItem);
  const headline = caseHeadlineFull(caseItem);
  const result = caseResultFull(caseItem);
  const steps = caseItem.steps ?? [];
  const primaryProduct = products[0];
  const productHref = usageHref ?? (primaryProduct ? `/products/${primaryProduct.id}` : null);
  const productLabel = products.length
    ? products.map((p) => p.name).join(" · ")
    : caseItem.productNames.join(" · ") || null;

  return (
    <article className="mx-auto max-w-2xl">
      <nav className="mb-5 text-base font-medium text-slate-500">
        <Link href="/cases" className="hover:text-teal-700">
          ← 사례
        </Link>
      </nav>

      <header className="mb-6">
        <span className="inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">
          사례 · {evidenceLevelLabel(caseItem.evidenceLevel)}
        </span>
        <h1 className="mt-4 break-keep text-3xl font-black leading-snug tracking-tight text-slate-950 sm:text-4xl">
          {headline}
        </h1>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-base font-bold text-amber-950 ring-1 ring-amber-200">
          현장 기록입니다. 처방이 아닙니다.
        </p>
        <p className="mt-3 text-lg text-slate-600">
          {place}
          {caseItem.categoryMajor && caseItem.categoryMajor !== place ? ` · ${caseItem.categoryMajor}` : ""}
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-6 sm:py-6">
        {productLabel ? (
          <FactRow label="쓴 제품">
            {products.length ? (
              <ul className="space-y-1">
                {products.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/products/${p.id}`}
                      className="break-keep text-2xl font-black text-slate-950 hover:text-teal-800"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="break-keep text-2xl font-black text-slate-950">{productLabel}</p>
            )}
          </FactRow>
        ) : null}

        {caseItem.dilution ? (
          <FactRow label="현장 희석">
            <p className="break-keep text-2xl font-black text-teal-800">{caseItem.dilution}</p>
          </FactRow>
        ) : null}

        {caseItem.dwell ? (
          <FactRow label="대기">
            <p className="break-keep text-xl font-black text-slate-950">{caseItem.dwell}</p>
          </FactRow>
        ) : null}

        {caseItem.tools?.length ? (
          <FactRow label="도구">
            <p className="text-xl font-bold text-slate-800">{caseItem.tools.join(" · ")}</p>
          </FactRow>
        ) : null}
      </section>

      {productHref ? (
        <Link
          href={productHref}
          className="mb-6 flex min-h-[52px] items-center justify-center rounded-2xl bg-slate-900 px-4 py-3.5 text-lg font-bold text-white hover:bg-teal-800"
        >
          이 사례에 쓰인 제품 보기
        </Link>
      ) : null}

      {result ? (
        <section className="mb-6 rounded-2xl border-2 border-teal-600 bg-teal-50 px-5 py-5 sm:px-6">
          <h2 className="text-2xl font-black text-slate-950">결과</h2>
          <p className="mt-3 text-lg leading-8 text-slate-900 sm:text-xl">{result}</p>
        </section>
      ) : null}

      {steps.length ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-6 sm:py-6">
          <h2 className="text-2xl font-black text-slate-950">작업 순서</h2>
          <p className="mt-1 text-base text-slate-500">이 현장에서 기록된 순서입니다.</p>
          <ol className="mt-5 space-y-4">
            {steps.map((s, i) => (
              <li key={`${s.order ?? i}-${s.stage}`} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-lg font-black text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-xl font-black text-slate-950">{s.stage}</p>
                  {s.content ? (
                    <p className="mt-2 text-lg leading-8 text-slate-700">{s.content}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-5">
          <h2 className="text-2xl font-black text-slate-950">작업 순서</h2>
          <p className="mt-2 text-lg text-slate-600">절차가 기록되어 있지 않습니다.</p>
        </section>
      )}
    </article>
  );
}
